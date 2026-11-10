"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { autoDetectMapping, detectHeaderRow, emptyMapping, isMappingValid, rowsToAgreements } from "@/lib/columns";
import * as G from "@/lib/google";
import {
  defaultFilters,
  loadLocalWorkbook,
  loadSession,
  localRecordsKey,
  parseWorkbook,
  saveLocalWorkbook,
  saveSession,
  type Session,
  type Source,
  type Workbook,
} from "@/lib/session";
import { APP_SHEET, GoogleBackend, LocalBackend, RecordStore } from "@/lib/store";
import type { ColumnMapping, Filters, SetupConfig } from "@/lib/types";
import { MainView } from "./MainView";
import { ColumnMappingStep, FilterSetup, SheetSelect, StartScreen } from "./Setup";
import { b, Modal } from "./ui";

type Step = "start" | "sheet" | "mapping" | "filters" | "main";
type Dialog = { kind: "xlsx" | "readonly"; file: G.FileMeta } | null;

export default function App() {
  const [step, setStep] = useState<Step>("start");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [user, setUser] = useState("");
  const [invite, setInvite] = useState<string | null>(null);
  const [resume, setResume] = useState<Session | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const [source, setSource] = useState<Source | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [store, setStore] = useState<RecordStore | null>(null);
  const storeRef = useRef<RecordStore | null>(null);

  // Initial: session, token, invite link (?sheet=ID)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setSignedIn(G.hasValidToken());
    setResume(loadSession());
    const id = new URLSearchParams(location.search).get("sheet");
    if (id) setInvite(id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Persist the session once the user reached the main view.
  useEffect(() => {
    if (source && step === "main") saveSession({ source, sheetName, headerRow, mapping, filters });
  }, [source, step, sheetName, headerRow, mapping, filters]);

  useEffect(() => () => storeRef.current?.stop(), []);

  const agreements = useMemo(() => rowsToAgreements(rows, headerRow, mapping), [rows, headerRow, mapping]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      console.error(e);
      if (e instanceof G.AuthError) setSignedIn(false);
      setError((e as Error).message ?? String(e));
    } finally {
      setBusy("");
    }
  };

  const replaceStore = (st: RecordStore) => {
    storeRef.current?.stop();
    storeRef.current = st;
    setStore(st);
  };

  const ensureSignedIn = async () => {
    if (!G.hasValidToken()) await G.signIn();
    setSignedIn(true);
    if (!user) {
      const me = await G.getMe().catch(() => ({ email: "", name: "" }));
      const u = me.email || me.name || "unknown";
      setUser(u);
      return u;
    }
    return user;
  };

  async function fetchRows(src: Source, name: string, wb: Workbook | null): Promise<string[][]> {
    if (src.kind === "google") return G.getValues(src.spreadsheetId, G.quoteSheet(name));
    return wb?.[name] ?? [];
  }

  async function chooseSheet(name: string, src: Source, wb: Workbook | null) {
    const r = await fetchRows(src, name, wb);
    const h = detectHeaderRow(r);
    setSheetName(name);
    setRows(r);
    setHeaderRow(h);
    setMapping(autoDetectMapping(r[h] ?? []));
    setStep("mapping");
  }

  /** Decide where to go after a file was opened: resume → shared config → sheet selection. */
  async function afterOpen(src: Source, sheetList: string[], wb: Workbook | null, cfg: SetupConfig | null, res: Session | null) {
    setSource(src);
    setSheets(sheetList);
    setWorkbook(wb);
    const preset: SetupConfig | null =
      res?.sheetName && res.mapping ? { sheetName: res.sheetName, headerRow: res.headerRow ?? 0, mapping: res.mapping } : cfg;
    if (preset && sheetList.includes(preset.sheetName) && isMappingValid(preset.mapping)) {
      const r = await fetchRows(src, preset.sheetName, wb);
      setSheetName(preset.sheetName);
      setRows(r);
      setHeaderRow(preset.headerRow);
      setMapping(preset.mapping);
      if (res?.filters) {
        setFilters({ ...defaultFilters(), ...res.filters });
        setStep("main");
      } else {
        setFilters(defaultFilters());
        setStep("filters");
      }
      return;
    }
    setFilters(defaultFilters());
    if (sheetList.length === 1) await chooseSheet(sheetList[0], src, wb);
    else if (!sheetList.length) throw new Error("The spreadsheet has no sheets with data.");
    else setStep("sheet");
  }

  async function startGoogle(meta: G.FileMeta, readOnly: boolean, res: Session | null = null) {
    const u = await ensureSignedIn();
    const info = await G.getSpreadsheet(meta.id);
    const st = new RecordStore(new GoogleBackend(meta.id, readOnly), u);
    await st.start();
    replaceStore(st);
    const src: Source = { kind: "google", spreadsheetId: meta.id, title: info.title, readOnly };
    await afterOpen(
      src,
      info.sheets.filter((s) => s.title !== APP_SHEET).map((s) => s.title),
      null,
      st.getSnapshot().config,
      res,
    );
  }

  async function openGoogle(fileId: string, res: Session | null = null) {
    const meta = await G.getFileMeta(fileId).catch((e) => {
      if ((e as { status?: number }).status === 404)
        throw new Error("No access to this file. Choose it via “Choose from Google Drive” so the app gets permission.");
      throw e;
    });
    if (meta.mimeType === G.XLSX_MIME) return setDialog({ kind: "xlsx", file: meta });
    if (meta.mimeType !== G.SHEET_MIME) throw new Error(`Unsupported file type: ${meta.mimeType}`);
    const readOnly = !meta.capabilities?.canEdit;
    if (readOnly && !res) return setDialog({ kind: "readonly", file: meta });
    await startGoogle(meta, readOnly, res);
  }

  async function startLocal(fileName: string, wb: Workbook, res: Session | null = null) {
    const st = new RecordStore(new LocalBackend(localRecordsKey(fileName)), user || "me");
    await st.start();
    replaceStore(st);
    await afterOpen({ kind: "local", fileName }, Object.keys(wb), wb, st.getSnapshot().config, res);
  }

  async function makeCopy(file: { id: string; name: string }) {
    await ensureSignedIn();
    const copy = await G.copyAsGoogleSheet(file.id, `${file.name.replace(/\.xlsx?$/i, "")} (Erasmus Chooser)`);
    await startGoogle({ ...copy, capabilities: { canEdit: true } }, false);
  }

  // ----- Handlers -----
  const handlers = {
    signIn: () => run("Signing in…", async () => void (await ensureSignedIn())),
    signOut: () => {
      G.signOut();
      setSignedIn(false);
      setUser("");
    },
    pick: () =>
      run("Waiting for Google Picker…", async () => {
        await ensureSignedIn();
        const f = await G.pickSpreadsheet();
        if (f) {
          setBusy("Opening spreadsheet…");
          await openGoogle(f.id);
        }
      }),
    openLink: (link: string) =>
      run("Opening…", async () => {
        const id = G.parseFileId(link);
        if (!id) throw new Error("This doesn't look like a Google Sheets link.");
        await ensureSignedIn();
        // With the drive.file scope the user must confirm access to the file through the Picker once.
        const f = await G.pickSpreadsheet(id);
        if (f) await openGoogle(f.id);
      }),
    acceptInvite: () =>
      run("Opening shared spreadsheet…", async () => {
        await ensureSignedIn();
        const f = await G.pickSpreadsheet(invite!);
        if (!f) return;
        history.replaceState(null, "", location.pathname);
        setInvite(null);
        await openGoogle(f.id);
      }),
    localFile: (file: File) =>
      run("Reading file…", async () => {
        const wb = await parseWorkbook(await file.arrayBuffer());
        saveLocalWorkbook(file.name, wb);
        await startLocal(file.name, wb);
      }),
    resume: () =>
      run("Restoring…", async () => {
        if (!resume) return;
        if (resume.source.kind === "google") {
          await ensureSignedIn();
          await openGoogle(resume.source.spreadsheetId, resume);
        } else {
          const wb = loadLocalWorkbook(resume.source.fileName);
          if (!wb) throw new Error("The local file is no longer cached. Please upload it again (your notes are kept).");
          await startLocal(resume.source.fileName, wb, resume);
        }
      }),
  };

  const closeFile = () => {
    storeRef.current?.stop();
    storeRef.current = null;
    setStore(null);
    setSource(null);
    setRows([]);
    setResume(loadSession());
    setStep("start");
  };

  // ----- Render -----
  if (step === "main" && store && source) {
    return (
      <>
        {error && (
          <div className="fixed left-1/2 top-3 z-[3000] flex max-w-xl -translate-x-1/2 items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 shadow-lg">
            <span className="flex-1">⚠ {error}</span>
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}
        {busy && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-900/30">
            <div className="rounded-lg bg-white px-5 py-3 text-sm font-medium shadow-xl">{busy}</div>
          </div>
        )}
        <MainView
          agreements={agreements}
          store={store}
          source={source}
          filters={filters}
          setFilters={setFilters}
          onEditSetup={() => setStep("filters")}
          onClose={closeFile}
          onMakeCopy={() =>
            source.kind === "google" && run("Copying…", () => makeCopy({ id: source.spreadsheetId, name: source.title }))
          }
          onReconnect={() =>
            G.signIn()
              .then(() => store.retry())
              .catch((e) => alert(e.message))
          }
        />
      </>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      {error && (
        <div className="mx-auto mb-4 flex max-w-3xl items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <span className="flex-1">⚠ {error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      {step === "start" && (
        <StartScreen
          googleConfigured={G.googleConfigured}
          signedIn={signedIn}
          user={user}
          busy={busy}
          invite={invite}
          resumeLabel={resume ? (resume.source.kind === "google" ? resume.source.title : resume.source.fileName) : null}
          onSignIn={handlers.signIn}
          onSignOut={handlers.signOut}
          onPick={handlers.pick}
          onOpenLink={handlers.openLink}
          onLocalFile={handlers.localFile}
          onResume={handlers.resume}
          onAcceptInvite={handlers.acceptInvite}
        />
      )}

      {step === "sheet" && source && (
        <SheetSelect sheets={sheets} onBack={closeFile} onSelect={(s) => run("Loading sheet…", () => chooseSheet(s, source, workbook))} />
      )}

      {step === "mapping" && (
        <ColumnMappingStep
          rows={rows}
          headerRow={headerRow}
          mapping={mapping}
          onChange={(m, h) => {
            if (h !== headerRow) {
              setHeaderRow(h);
              setMapping(autoDetectMapping(rows[h] ?? []));
            } else setMapping(m);
          }}
          onBack={() => (sheets.length > 1 ? setStep("sheet") : closeFile())}
          onConfirm={() => {
            // Share the setup with everybody who opens the same spreadsheet.
            if (store && !store.getSnapshot().readOnly) store.setConfig({ sheetName, headerRow, mapping });
            setStep("filters");
          }}
        />
      )}

      {step === "filters" && (
        <FilterSetup
          agreements={agreements}
          filters={filters}
          onChange={setFilters}
          onBack={() => setStep("mapping")}
          onConfirm={() => setStep("main")}
        />
      )}

      {dialog?.kind === "xlsx" && (
        <Modal title="This is an Excel file" onClose={() => setDialog(null)}>
          <p className="text-sm text-slate-600">
            Notes can only be stored inside a native Google Sheet. You can convert a copy of <b>{dialog.file.name}</b> into a Google Sheet in your
            Drive, or open it like a local file (notes stay in this browser).
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              className={b()}
              onClick={() => {
                const file = dialog.file;
                setDialog(null);
                void run("Downloading…", async () => {
                  const wb = await parseWorkbook(await G.downloadFile(file.id));
                  saveLocalWorkbook(file.name, wb);
                  await startLocal(file.name, wb);
                });
              }}
            >
              Open locally
            </button>
            <button
              className={b("primary")}
              disabled={dialog.file.capabilities?.canCopy === false}
              onClick={() => {
                const file = dialog.file;
                setDialog(null);
                void run("Converting to Google Sheets…", () => makeCopy(file));
              }}
            >
              Convert to Google Sheet
            </button>
          </div>
        </Modal>
      )}

      {dialog?.kind === "readonly" && (
        <Modal title="View-only access" onClose={() => setDialog(null)}>
          <p className="text-sm text-slate-600">
            You can only view <b>{dialog.file.name}</b>. Make your own copy to add notes, or open it read-only. To collaborate on the same file, ask
            the owner for edit access.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              className={b()}
              onClick={() => {
                const file = dialog.file;
                setDialog(null);
                void run("Opening…", () => startGoogle(file, true));
              }}
            >
              View only
            </button>
            <button
              className={b("primary")}
              disabled={dialog.file.capabilities?.canCopy === false}
              onClick={() => {
                const file = dialog.file;
                setDialog(null);
                void run("Copying…", () => makeCopy(file));
              }}
            >
              Make an editable copy
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
