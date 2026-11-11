"use client";
import React from "react";
import { MapPin, Scale } from "lucide-react";
import type { Agreement } from "@/lib/types";
import type { RecordStore, StoreState } from "@/lib/store";
import type { ColumnKey } from "@/lib/hooks/useColumnVisibility";
import type { GrantCategory } from "@/lib/config/erasmusGrants";
import { TableRow } from "./TableRow";

export type SortKey =
  | "priority"
  | "uniName"
  | "country"
  | "faculty"
  | "program"
  | "validTo"
  | "language"
  | "budget"
  | "status"
  | "notes"
  | "location";

export interface ColumnHeaderDef {
  key: SortKey;
  label: React.ReactNode;
  cls?: string;
  visibilityKey: ColumnKey;
}

const COLUMNS: ColumnHeaderDef[] = [
  { key: "priority", label: "Priority", cls: "w-24", visibilityKey: "priority" },
  { key: "uniName", label: "University", visibilityKey: "uniName" },
  { key: "country", label: "Country", cls: "w-20", visibilityKey: "country" },
  { key: "faculty", label: "Faculty", cls: "w-20", visibilityKey: "faculty" },
  { key: "program", label: "Program", cls: "w-28", visibilityKey: "program" },
  { key: "validTo", label: "Valid until", cls: "w-24", visibilityKey: "validTo" },
  { key: "language", label: "Language", cls: "w-28", visibilityKey: "language" },
  { key: "budget", label: "Grant", cls: "w-28 whitespace-nowrap", visibilityKey: "budget" },
  { key: "status", label: "Status", cls: "w-28", visibilityKey: "status" },
  { key: "notes", label: "Notes / links", cls: "w-28", visibilityKey: "notes" },
  {
    key: "location",
    label: <MapPin className="mx-auto h-3.5 w-3.5" strokeWidth={1.75} />,
    cls: "w-10",
    visibilityKey: "location",
  },
];

export function AgreementsTable({
  agreements,
  state,
  store,
  sort,
  setSort,
  selectedRow,
  selectedUni,
  comparedKeys,
  onToggleCompare,
  onSelectAgreement,
  onDoubleClickRow,
  onOpenDetails,
  visibility,
  grantCategories,
  tableRef,
  now,
}: {
  agreements: Agreement[];
  state: StoreState;
  store: RecordStore;
  sort: { key: SortKey; dir: 1 | -1 };
  setSort: React.Dispatch<React.SetStateAction<{ key: SortKey; dir: 1 | -1 }>>;
  selectedRow: string | null;
  selectedUni: string | null;
  comparedKeys: string[];
  onToggleCompare: (uniKey: string) => void;
  onSelectAgreement: (a: Agreement) => void;
  onDoubleClickRow: (uniKey: string) => void;
  onOpenDetails: (uniKey: string) => void;
  visibility: Record<ColumnKey, boolean>;
  grantCategories?: GrantCategory[];
  tableRef: React.RefObject<HTMLDivElement | null>;
  now: number;
}) {
  return (
    <div ref={tableRef} className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e2e8f0] dark:bg-slate-900 dark:shadow-[0_1px_0_#1e293b]">
          <tr>
            <th className="w-8 px-2 py-2 text-center text-xs font-semibold text-slate-500" title="Compare">
              <Scale className="mx-auto h-3.5 w-3.5" />
            </th>
            {COLUMNS.map((c) => {
              if (!visibility[c.visibilityKey]) return null;
              return (
                <th
                  key={c.key}
                  className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 ${
                    c.cls ?? ""
                  }`}
                  onClick={() =>
                    setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))
                  }
                >
                  {c.label}
                  {sort.key === c.key && <span className="ml-1">{sort.dir === 1 ? "▲" : "▼"}</span>}
                </th>
              );
            })}
            <th className="w-16" />
          </tr>
        </thead>
        <tbody>
          {agreements.map((a) => (
            <TableRow
              key={a.id}
              agreement={a}
              state={state}
              store={store}
              isSelectedRow={a.id === selectedRow}
              isSelectedUni={a.uniKey === selectedUni}
              isCompared={comparedKeys.includes(a.uniKey)}
              onToggleCompare={onToggleCompare}
              onSelect={onSelectAgreement}
              onDoubleClick={onDoubleClickRow}
              onOpenDetails={onOpenDetails}
              visibility={visibility}
              grantCategories={grantCategories}
              now={now}
            />
          ))}
        </tbody>
      </table>
      {!agreements.length && (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500">
          No agreements match the current filters.
        </div>
      )}
    </div>
  );
}
