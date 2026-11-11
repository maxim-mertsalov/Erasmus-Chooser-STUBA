"use client";
// Record store with two backends:
//  - GoogleBackend: records live in a dedicated sheet ("_erasmus_app") of the same spreadsheet,
//    one record per row: key | type | data(JSON) | updatedAt | updatedBy.
//  - LocalBackend: records live in localStorage (for local .xlsx files).
//
// Concurrency model (several people editing the same spreadsheet):
//  - Notes and links are separate records (one per note), so concurrent additions never collide.
//  - University/row records are patched field-by-field: before every write we pull the latest
//    remote state and apply only the locally changed fields on top of it.
//  - Remote changes are pulled periodically (polling) and override local state for keys
//    that don't have unsaved local changes.
//  - Rows are never deleted (deletions are tombstones), so row positions stay stable.
import * as G from "./google";
import type { LinkData, NoteData, RecordType, RowData, SetupConfig, StoredRecord, UniData } from "./types";
import type { GrantCategory } from "./config/erasmusGrants";

export const APP_SHEET = "_erasmus_app";
const HEADER = ["key", "type", "data", "updatedAt", "updatedBy"];

export interface Backend {
  readonly kind: "google" | "local";
  readonly readOnly: boolean;
  readonly pollMs: number;
  init(): Promise<void>;
  pull(): Promise<StoredRecord[]>;
  push(recs: StoredRecord[]): Promise<void>;
}

function parseRow(r: string[]): StoredRecord | null {
  if (!r[0] || r[0] === "key") return null;
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(r[2] || "{}");
  } catch {
    /* corrupted cell, ignore */
  }
  return { key: r[0], type: (r[1] || "uni") as RecordType, data, updatedAt: r[3] || "", updatedBy: r[4] || "" };
}

const toRow = (rec: StoredRecord) => [rec.key, rec.type, JSON.stringify(rec.data), rec.updatedAt, rec.updatedBy];

export class GoogleBackend implements Backend {
  readonly kind = "google" as const;
  readonly pollMs = 15_000;
  private rowOf = new Map<string, number>();
  private exists = false;

  constructor(
    readonly spreadsheetId: string,
    readonly readOnly: boolean,
  ) {}

  async init() {
    const info = await G.getSpreadsheet(this.spreadsheetId);
    this.exists = info.sheets.some((s) => s.title === APP_SHEET);
    if (!this.exists && !this.readOnly) {
      try {
        await G.addSheet(this.spreadsheetId, APP_SHEET);
        await G.batchUpdateValues(this.spreadsheetId, [{ range: `${APP_SHEET}!A1:E1`, values: [HEADER] }]);
      } catch (e) {
        // Another user may have created it at the same moment.
        if (!String((e as Error).message).toLowerCase().includes("already exists")) throw e;
      }
      this.exists = true;
    }
  }

  async pull(): Promise<StoredRecord[]> {
    if (!this.exists) return [];
    const rows = await G.getValues(this.spreadsheetId, `${APP_SHEET}!A:E`);
    const latest = new Map<string, StoredRecord>();
    this.rowOf.clear();
    rows.forEach((r, i) => {
      const rec = parseRow(r);
      if (!rec) return;
      if (!this.rowOf.has(rec.key)) this.rowOf.set(rec.key, i + 1);
      const prev = latest.get(rec.key);
      // Duplicate keys can appear if two users appended the same new key simultaneously.
      if (!prev || rec.updatedAt >= prev.updatedAt) latest.set(rec.key, rec);
    });
    return [...latest.values()];
  }

  async push(recs: StoredRecord[]) {
    if (this.readOnly || !recs.length) return;
    const updates = recs.filter((r) => this.rowOf.has(r.key));
    const inserts = recs.filter((r) => !this.rowOf.has(r.key));
    if (updates.length) {
      await G.batchUpdateValues(
        this.spreadsheetId,
        updates.map((r) => {
          const n = this.rowOf.get(r.key)!;
          return { range: `${APP_SHEET}!A${n}:E${n}`, values: [toRow(r)] };
        }),
      );
    }
    if (inserts.length) {
      const range = await G.appendValues(this.spreadsheetId, `${APP_SHEET}!A:E`, inserts.map(toRow));
      const m = range?.match(/!A(\d+)/);
      if (m) inserts.forEach((r, i) => this.rowOf.set(r.key, Number(m[1]) + i));
    }
  }
}

export class LocalBackend implements Backend {
  readonly kind = "local" as const;
  readonly readOnly = false;
  readonly pollMs = 0;
  constructor(readonly storageKey: string) {}
  async init() {}
  async pull(): Promise<StoredRecord[]> {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) ?? "[]");
    } catch {
      return [];
    }
  }
  async push(recs: StoredRecord[]) {
    const map = new Map((await this.pull()).map((r) => [r.key, r]));
    recs.forEach((r) => map.set(r.key, r));
    localStorage.setItem(this.storageKey, JSON.stringify([...map.values()]));
  }
}

// ---------- Store ----------

export type SyncStatus = "loading" | "idle" | "saving" | "error" | "auth";

export interface NoteItem extends NoteData {
  key: string;
}
export interface LinkItem extends LinkData {
  key: string;
}

export interface StoreState {
  version: number;
  uni: Map<string, UniData>;
  row: Map<string, RowData>;
  notes: Map<string, NoteItem[]>;
  links: Map<string, LinkItem[]>;
  config: SetupConfig | null;
  grants: GrantCategory[] | null;
  status: SyncStatus;
  error: string;
  lastSync: number;
  readOnly: boolean;
  kind: "google" | "local";
}

interface Pending {
  type: RecordType;
  patch: Record<string, unknown>;
  replace: boolean;
}

export const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export class RecordStore {
  private records = new Map<string, StoredRecord>();
  private pending = new Map<string, Pending>();
  private listeners = new Set<() => void>();
  private version = 0;
  private state: StoreState | null = null;
  private status: SyncStatus = "loading";
  private error = "";
  private lastSync = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private flushAgain = false;

  constructor(
    readonly backend: Backend,
    public user: string,
  ) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private emit() {
    this.version++;
    this.state = null;
    this.listeners.forEach((l) => l());
  }

  async start() {
    try {
      await this.backend.init();
      this.applyRemote(await this.backend.pull());
      this.setStatus("idle");
    } catch (e) {
      this.fail(e);
      throw e;
    }
    if (this.backend.pollMs) {
      this.pollTimer = setInterval(() => {
        if (document.visibilityState === "visible") void this.poll();
      }, this.backend.pollMs);
    }
  }

  stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.flushTimer) clearTimeout(this.flushTimer);
  }

  async poll() {
    if (this.flushing || this.pending.size || this.status === "auth") return;
    try {
      this.applyRemote(await this.backend.pull());
      if (this.status === "error") this.setStatus("idle");
      else this.emit();
    } catch (e) {
      this.fail(e);
    }
  }

  /** Retry after an auth/network error. */
  retry() {
    this.setStatus(this.pending.size ? "saving" : "idle");
    if (this.pending.size) void this.flush();
    else void this.poll();
  }

  private applyRemote(remote: StoredRecord[]) {
    for (const rec of remote) this.records.set(rec.key, rec);
    this.lastSync = Date.now();
  }

  private setStatus(s: SyncStatus, err = "") {
    this.status = s;
    this.error = err;
    this.emit();
  }

  private fail(e: unknown) {
    if (e instanceof G.AuthError) this.setStatus("auth", e.message);
    else this.setStatus("error", (e as Error)?.message ?? String(e));
  }

  /** Queue a change. `replace` writes the whole record instead of merging fields. */
  upsert(key: string, type: RecordType, patch: Record<string, unknown>, replace = false) {
    const prev = this.pending.get(key);
    this.pending.set(key, {
      type,
      patch: replace ? patch : { ...(prev?.patch ?? {}), ...patch },
      replace: replace || Boolean(prev?.replace),
    });
    if (this.status !== "auth") this.status = "saving";
    this.emit();
    // Throttle (not debounce): a burst of edits is batched into one write every ~2 seconds.
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(
        () => {
          this.flushTimer = null;
          void this.flush();
        },
        this.backend.kind === "local" ? 200 : 2000,
      );
    }
  }

  private async flush() {
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    if (!this.pending.size) return;
    this.flushing = true;
    try {
      if (!this.backend.readOnly) this.applyRemote(await this.backend.pull()); // get the freshest state first
      const now = new Date().toISOString();
      const batch: [string, Pending, StoredRecord][] = [];
      for (const [key, p] of this.pending) {
        const base = p.replace ? {} : (this.records.get(key)?.data ?? {});
        batch.push([key, p, { key, type: p.type, data: { ...base, ...p.patch }, updatedAt: now, updatedBy: this.user }]);
      }
      await this.backend.push(batch.map((b) => b[2]));
      for (const [key, p, rec] of batch) {
        this.records.set(key, rec);
        if (this.pending.get(key) === p) this.pending.delete(key);
      }
      this.setStatus(this.pending.size ? "saving" : "idle");
    } catch (e) {
      this.fail(e);
    } finally {
      this.flushing = false;
      if ((this.flushAgain || this.pending.size) && this.status !== "auth" && this.status !== "error") {
        this.flushAgain = false;
        if (!this.flushTimer) {
          this.flushTimer = setTimeout(() => {
            this.flushTimer = null;
            void this.flush();
          }, 1000);
        }
      }
    }
  }

  private dataOf(key: string): Record<string, unknown> | undefined {
    const rec = this.records.get(key);
    const p = this.pending.get(key);
    if (!rec && !p) return undefined;
    if (!p) return rec!.data;
    return p.replace ? p.patch : { ...(rec?.data ?? {}), ...p.patch };
  }

  getSnapshot = (): StoreState => {
    if (this.state) return this.state;
    const uni = new Map<string, UniData>();
    const row = new Map<string, RowData>();
    const notes = new Map<string, NoteItem[]>();
    const links = new Map<string, LinkItem[]>();
    let config: SetupConfig | null = null;
    let grants: GrantCategory[] | null = null;
    const keys = new Set([...this.records.keys(), ...this.pending.keys()]);
    for (const key of keys) {
      const data = this.dataOf(key);
      if (!data) continue;
      const type = this.pending.get(key)?.type ?? this.records.get(key)!.type;
      if (type === "uni") uni.set(key.slice(4), data as UniData);
      else if (type === "row") row.set(key.slice(4), data as RowData);
      else if (type === "note" && !data.deleted) {
        const n = data as unknown as NoteData;
        (notes.get(n.uniKey) ?? notes.set(n.uniKey, []).get(n.uniKey)!).push({ ...n, key });
      } else if (type === "link" && !data.deleted) {
        const l = data as unknown as LinkData;
        (links.get(l.uniKey) ?? links.set(l.uniKey, []).get(l.uniKey)!).push({ ...l, key });
      } else if (type === "config" && key === "config:setup") config = data as unknown as SetupConfig;
      else if (type === "config" && key === "config:grants") {
        grants = (data as { grants: GrantCategory[] }).grants ?? null;
      }
    }
    notes.forEach((arr) => arr.sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")));
    this.state = {
      version: this.version,
      uni,
      row,
      notes,
      links,
      config,
      grants,
      status: this.status,
      error: this.error,
      lastSync: this.lastSync,
      readOnly: this.backend.readOnly,
      kind: this.backend.kind,
    };
    return this.state;
  };

  // ----- convenience mutators -----
  setUni(uniKey: string, patch: Partial<UniData>) {
    this.upsert(`uni:${uniKey}`, "uni", patch as Record<string, unknown>);
  }
  setRow(id: string, patch: Partial<RowData>) {
    this.upsert(`row:${id}`, "row", patch as Record<string, unknown>);
  }
  addNote(uniKey: string, category: string, text: string) {
    const n: NoteData = { uniKey, category, text, author: this.user, createdAt: new Date().toISOString() };
    this.upsert(`note:${newId()}`, "note", n as unknown as Record<string, unknown>, true);
  }
  updateNote(key: string, patch: Partial<NoteData>) {
    this.upsert(key, "note", patch as Record<string, unknown>);
  }
  deleteNote(key: string) {
    this.upsert(key, "note", { deleted: true });
  }
  addLink(uniKey: string, label: string, url: string) {
    this.upsert(`link:${newId()}`, "link", { uniKey, label, url }, true);
  }
  deleteLink(key: string) {
    this.upsert(key, "link", { deleted: true });
  }
  setConfig(cfg: SetupConfig) {
    this.upsert("config:setup", "config", cfg as unknown as Record<string, unknown>, true);
  }
  setGrants(cats: GrantCategory[]) {
    this.upsert("config:grants", "config", { grants: cats } as Record<string, unknown>, true);
  }

  /** All records (for JSON export). */
  exportAll(): StoredRecord[] {
    const keys = new Set([...this.records.keys(), ...this.pending.keys()]);
    return [...keys].map((key) => ({
      key,
      type: this.pending.get(key)?.type ?? this.records.get(key)!.type,
      data: this.dataOf(key)!,
      updatedAt: this.records.get(key)?.updatedAt ?? new Date().toISOString(),
      updatedBy: this.records.get(key)?.updatedBy ?? this.user,
    }));
  }

  importAll(recs: StoredRecord[]) {
    for (const r of recs) if (r?.key && r.type) this.upsert(r.key, r.type, r.data, true);
  }
}
