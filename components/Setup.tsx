"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileSpreadsheet, FolderOpen, GraduationCap, RotateCcw, Upload } from "lucide-react";
import { FIELD_LABELS, isMappingValid } from "@/lib/columns";
import type { Agreement, ColumnMapping, FieldKey, Filters } from "@/lib/types";
import { b, inputCls, Spinner } from "./ui";

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

// ---------------- Start ----------------

export function StartScreen(props: {
  googleConfigured: boolean;
  signedIn: boolean;
  user: string;
  resumeLabel: string | null;
  invite: string | null;
  busy: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onPick: () => void;
  onOpenLink: (link: string) => void;
  onLocalFile: (f: File) => void;
  onResume: () => void;
  onAcceptInvite: () => void;
}) {
  const [link, setLink] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const disabled = Boolean(props.busy);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="text-center">
        <h1 className="inline-flex items-center gap-2.5 text-3xl font-bold tracking-tight">
          <GraduationCap className="h-8 w-8 text-indigo-600" strokeWidth={1.75} />
          <span>Erasmus Chooser</span>
        </h1>
        <p className="mt-2 text-slate-500">Load the agreements spreadsheet, filter it, take notes and explore partners on a map.</p>
      </div>

      {props.busy && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-700">
          <Spinner /> {props.busy}
        </div>
      )}

      {props.invite && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="font-medium">You have been invited to open a shared spreadsheet.</div>
          <p className="text-sm text-slate-600">Sign in with Google and confirm access in the dialog.</p>
          <button className={b("primary", "mt-3")} disabled={disabled || !props.googleConfigured} onClick={props.onAcceptInvite}>
            Open shared spreadsheet
          </button>
        </div>
      )}

      {props.resumeLabel && (
        <button className={b("secondary", "justify-between py-3")} disabled={disabled} onClick={props.onResume}>
          <span className="inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
            <span>
              Continue with <b>{props.resumeLabel}</b>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.75} />
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Google Sheets" subtitle="Recommended. Notes are saved into the spreadsheet and shared with everyone who opens it.">
          {!props.googleConfigured ? (
            <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">
              Google API keys are not configured. Add them to <code>.env.local</code> (see README).
            </p>
          ) : !props.signedIn ? (
            <button className={b("primary", "w-full")} disabled={disabled} onClick={props.onSignIn}>
              Sign in with Google
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span className="truncate">Signed in{props.user ? ` as ${props.user}` : ""}</span>
                <button className="text-xs text-slate-400 hover:underline" onClick={props.onSignOut}>
                  Sign out
                </button>
              </div>
              <button className={b("primary")} disabled={disabled} onClick={props.onPick}>
                <FolderOpen className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Choose from Google Drive</span>
              </button>
              <div className="flex gap-2">
                <input className={inputCls} placeholder="…or paste a Google Sheets link" value={link} onChange={(e) => setLink(e.target.value)} />
                <button className={b()} disabled={disabled || !link.trim()} onClick={() => props.onOpenLink(link)}>
                  Open
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Local file" subtitle=".xlsx / .xls / .csv — notes are kept in this browser only (export/import as JSON).">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,.ods"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) props.onLocalFile(f);
              e.target.value = "";
            }}
          />
          <button className={b("secondary", "w-full")} disabled={disabled} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span>Upload spreadsheet</span>
          </button>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2 text-xs text-slate-300">
        <Link href="/privacy" className="transition-colors hover:text-slate-500">
          Privacy Policy
        </Link>
        <span>·</span>
        <Link href="/terms" className="transition-colors hover:text-slate-500">
          Terms of Use
        </Link>
      </div>
    </div>
  );
}

// ---------------- Sheet selection ----------------

export function SheetSelect({ sheets, onSelect, onBack }: { sheets: string[]; onSelect: (s: string) => void; onBack: () => void }) {
  return (
    <Card title="Choose the sheet with agreements" subtitle="The spreadsheet contains several sheets.">
      <div className="grid gap-2">
        {sheets.map((s) => (
          <button key={s} className={b("secondary", "justify-start py-2.5")} onClick={() => onSelect(s)}>
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
            <span>{s}</span>
          </button>
        ))}
      </div>
      <button className={b("ghost", "mt-4")} onClick={onBack}>
        <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span>Back</span>
      </button>
    </Card>
  );
}

// ---------------- Column mapping ----------------

function colLetter(idx: number): string {
  let s = "";
  let n = idx + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function ColumnMappingStep(props: {
  rows: string[][];
  headerRow: number;
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping, headerRow: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { rows, headerRow, mapping } = props;
  const headers = rows[headerRow] ?? [];
  const preview = rows.slice(headerRow + 1, headerRow + 6);
  const valid = isMappingValid(mapping);
  const fields = Object.keys(FIELD_LABELS) as FieldKey[];

  return (
    <Card title="Match the columns" subtitle="We detected the columns automatically. Check them and fix if needed.">
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-slate-500">Header row:</span>
        <select className={`${inputCls} w-24`} value={headerRow} onChange={(e) => props.onChange(mapping, Number(e.target.value))}>
          {rows.slice(0, 10).map((_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <label key={f} className="flex items-center gap-2 text-sm">
            <span className="w-36 shrink-0">
              {FIELD_LABELS[f].label}
              {FIELD_LABELS[f].required && <span className="text-rose-500"> *</span>}
            </span>
            <select
              className={`${inputCls} ${FIELD_LABELS[f].required && mapping[f] < 0 ? "border-rose-400" : ""}`}
              value={mapping[f]}
              onChange={(e) => props.onChange({ ...mapping, [f]: Number(e.target.value) }, headerRow)}
            >
              <option value={-1}>— not present —</option>
              {headers.map((h, i) => (
                <option key={i} value={i}>
                  {colLetter(i)}: {h || "(empty)"}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              {fields.map((f) => (
                <th key={f} className="px-2 py-1 text-left font-medium text-slate-500">
                  {FIELD_LABELS[f].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                {fields.map((f) => (
                  <td key={f} className="max-w-48 truncate px-2 py-1">
                    {mapping[f] >= 0 ? r[mapping[f]] : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex justify-between">
        <button className={b("ghost")} onClick={props.onBack}>
          ← Back
        </button>
        <button className={b("primary")} disabled={!valid} onClick={props.onConfirm}>
          Continue →
        </button>
      </div>
    </Card>
  );
}

// ---------------- Filter setup ----------------

function FilterGroup({
  title,
  items,
  selected,
  onChange,
}: {
  title: string;
  items: [string, number][];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium">{title}</h3>
        <div className="flex gap-2 text-xs">
          <button className="text-indigo-600 hover:underline" onClick={() => onChange(items.map((i) => i[0]))}>
            All
          </button>
          <button className="text-slate-500 hover:underline" onClick={() => onChange([])}>
            None
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(([v, n]) => (
          <button
            key={v}
            onClick={() => toggle(v)}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              selected.includes(v) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:border-indigo-400"
            }`}
          >
            {v} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterSetup(props: {
  agreements: Agreement[];
  filters: Filters;
  onChange: (f: Filters) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const { agreements, filters } = props;
  const count = (key: "faculty" | "program") => {
    const m = new Map<string, number>();
    agreements.forEach((a) => m.set(a[key] || "(empty)", (m.get(a[key] || "(empty)") ?? 0) + 1));
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0]));
  };
  const faculties = useMemo(() => count("faculty"), [agreements]); // eslint-disable-line react-hooks/exhaustive-deps
  const programs = useMemo(() => count("program"), [agreements]); // eslint-disable-line react-hooks/exhaustive-deps

  const matching = agreements.filter(
    (a) =>
      (!filters.faculties.length || filters.faculties.includes(a.faculty || "(empty)")) &&
      (!filters.programs.length || filters.programs.includes(a.program || "(empty)")) &&
      (!filters.onlyActive || a.active),
  ).length;

  return (
    <Card title="What are you interested in?" subtitle="Pick one or more faculties and program types. Nothing selected = everything.">
      <div className="flex flex-col gap-6">
        <FilterGroup title="Faculty" items={faculties} selected={filters.faculties} onChange={(v) => props.onChange({ ...filters, faculties: v })} />
        <FilterGroup title="Program type" items={programs} selected={filters.programs} onChange={(v) => props.onChange({ ...filters, programs: v })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={filters.onlyActive} onChange={(e) => props.onChange({ ...filters, onlyActive: e.target.checked })} />
          Only active agreements
        </label>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <button className={b("ghost")} onClick={props.onBack}>
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{matching} agreements</span>
          <button className={b("primary")} disabled={!matching} onClick={props.onConfirm}>
            Show →
          </button>
        </div>
      </div>
    </Card>
  );
}
