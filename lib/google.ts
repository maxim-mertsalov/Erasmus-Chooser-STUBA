"use client";
// Thin browser-side wrapper around Google Identity Services, Google Picker,
// Drive v3 and Sheets v4 REST APIs. No server secret is needed.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "";
// drive.file = access only to files the user explicitly opens with the Picker
// (or files created by this app). It is a non-sensitive scope: no Google verification needed.
const SCOPES = "https://www.googleapis.com/auth/drive.file";

export const googleConfigured = Boolean(CLIENT_ID && API_KEY);

export const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export class AuthError extends Error {
  constructor(msg = "Google session expired. Please reconnect.") {
    super(msg);
    this.name = "AuthError";
  }
}

const scriptPromises = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  if (!scriptPromises.has(src)) {
    scriptPromises.set(
      src,
      new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => {
          scriptPromises.delete(src);
          reject(new Error(`Failed to load ${src}`));
        };
        document.head.appendChild(s);
      }),
    );
  }
  return scriptPromises.get(src)!;
}

// ---------- Auth (GIS token model) ----------

interface Token {
  access_token: string;
  expires_at: number;
}
const TOKEN_KEY = "erasmus-google-token";
let token: Token | null = null;
let tokenClient: any = null;

function readToken(): Token | null {
  if (token) return token;
  try {
    const t = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? "null") as Token | null;
    if (t && t.expires_at > Date.now()) token = t;
  } catch {
    /* ignore */
  }
  return token;
}

export function hasValidToken(): boolean {
  const t = readToken();
  return Boolean(t && t.expires_at - 60_000 > Date.now());
}

export function signOut() {
  const t = readToken();
  if (t && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(t.access_token, () => {});
  token = null;
  sessionStorage.removeItem(TOKEN_KEY);
}

/** Must be called from a user gesture (click) because it may open a popup. */
export async function signIn(): Promise<string> {
  if (!googleConfigured) throw new Error("Google API is not configured. See README (.env.local).");
  await loadScript("https://accounts.google.com/gsi/client");
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error_description || resp.error));
        token = { access_token: resp.access_token, expires_at: Date.now() + Number(resp.expires_in) * 1000 };
        sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        resolve(token.access_token);
      },
      error_callback: (err: any) => reject(new Error(err?.message || err?.type || "Sign-in cancelled")),
    });
    tokenClient.requestAccessToken({ prompt: hasValidToken() ? "" : undefined });
  });
}

function accessToken(): string {
  if (!hasValidToken()) throw new AuthError();
  return readToken()!.access_token;
}

async function api<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      ...(init.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (res.status === 401) {
    token = null;
    sessionStorage.removeItem(TOKEN_KEY);
    throw new AuthError();
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j?.error?.message ?? msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const ct = res.headers.get("content-type") ?? "";
  return (ct.includes("json") ? res.json() : res.arrayBuffer()) as Promise<T>;
}

// ---------- Picker ----------

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
}

/** Opens Google Picker. If fileId is given, the picker shows only that file (used for share links). */
export async function pickSpreadsheet(fileId?: string): Promise<PickedFile | null> {
  const tok = accessToken();
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((r) => window.gapi.load("picker", () => r()));
  const g = window.google.picker;
  const mimes = `${SHEET_MIME},${XLSX_MIME}`;

  return new Promise((resolve) => {
    const builder = new g.PickerBuilder()
      .setOAuthToken(tok)
      .setDeveloperKey(API_KEY)
      .setTitle(fileId ? "Confirm access to the shared spreadsheet" : "Select a spreadsheet with agreements")
      .setCallback((data: any) => {
        if (data.action === g.Action.PICKED) {
          const d = data.docs[0];
          resolve({ id: d.id, name: d.name, mimeType: d.mimeType });
        } else if (data.action === g.Action.CANCEL) resolve(null);
      });
    if (APP_ID) builder.setAppId(APP_ID);
    if (fileId) {
      builder.addView(new g.DocsView().setFileIds(fileId).setMode(g.DocsViewMode.LIST));
    } else {
      builder
        .addView(new g.DocsView(g.ViewId.SPREADSHEETS).setMimeTypes(mimes).setMode(g.DocsViewMode.LIST))
        .addView(new g.DocsView(g.ViewId.SPREADSHEETS).setMimeTypes(mimes).setOwnedByMe(false).setLabel("Shared with me"))
        .addView(new g.DocsUploadView());
    }
    builder.build().setVisible(true);
  });
}

// ---------- Drive ----------

export interface FileMeta {
  id: string;
  name: string;
  mimeType: string;
  capabilities?: { canEdit?: boolean; canCopy?: boolean };
}

export function getFileMeta(id: string) {
  return api<FileMeta>(
    `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,capabilities(canEdit,canCopy)&supportsAllDrives=true`,
  );
}

/** Copies a file (also converts .xlsx) into a native Google Sheet owned by the current user. */
export function copyAsGoogleSheet(id: string, name: string) {
  return api<FileMeta>(`https://www.googleapis.com/drive/v3/files/${id}/copy?supportsAllDrives=true&fields=id,name,mimeType`, {
    method: "POST",
    body: JSON.stringify({ name, mimeType: SHEET_MIME }),
  });
}

export function downloadFile(id: string) {
  return api<ArrayBuffer>(`https://www.googleapis.com/drive/v3/files/${id}?alt=media&supportsAllDrives=true`);
}

export async function getMe(): Promise<{ name: string; email: string }> {
  const r = await api<any>("https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)");
  return { name: r.user?.displayName ?? "", email: r.user?.emailAddress ?? "" };
}

// ---------- Sheets ----------

const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

export const quoteSheet = (title: string) => `'${title.replace(/'/g, "''")}'`;

export interface SpreadsheetInfo {
  title: string;
  sheets: { sheetId: number; title: string; rowCount: number }[];
}

export async function getSpreadsheet(id: string): Promise<SpreadsheetInfo> {
  const r = await api<any>(`${SHEETS}/${id}?fields=properties.title,sheets.properties(sheetId,title,gridProperties.rowCount)`);
  return {
    title: r.properties.title,
    sheets: r.sheets.map((s: any) => ({
      sheetId: s.properties.sheetId,
      title: s.properties.title,
      rowCount: s.properties.gridProperties?.rowCount ?? 0,
    })),
  };
}

export async function getValues(id: string, range: string): Promise<string[][]> {
  const r = await api<any>(
    `${SHEETS}/${id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,
  );
  return (r.values ?? []) as string[][];
}

export function batchUpdateValues(id: string, data: { range: string; values: string[][] }[]) {
  return api(`${SHEETS}/${id}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
}

export async function appendValues(id: string, range: string, values: string[][]): Promise<string | undefined> {
  const r = await api<any>(
    `${SHEETS}/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
  return r.updates?.updatedRange as string | undefined;
}

export function addSheet(id: string, title: string) {
  return api(`${SHEETS}/${id}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title, gridProperties: { columnCount: 6 } } } }] }),
  });
}

/** Extract a file id from a Google Sheets / Drive URL (or return the input if it already looks like an id). */
export function parseFileId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(s) ? s : null;
}
