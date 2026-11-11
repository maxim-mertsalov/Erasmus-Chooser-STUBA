"use client";
import React from "react";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  HelpCircle,
  Link2,
  MapPin,
  MessageSquareText,
  Pencil,
} from "lucide-react";
import type { Agreement, RowStatus } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import type { RecordStore, StoreState } from "@/lib/store";
import type { ColumnKey } from "@/lib/hooks/useColumnVisibility";
import { type GrantCategory, getGrantForCountry } from "@/lib/config/erasmusGrants";
import { countryName, flag } from "@/lib/countries";
import { Stars } from "@/components/ui";

export type LocStatus = "exact" | "auto" | "unresolved" | "manual" | "missing";

export function locState(state: StoreState, uniKey: string): LocStatus {
  const d = state.uni.get(uniKey);
  if (d?.lat == null) return "missing";
  if (d.geoSource === "manual") return "manual";
  if (d.geoSource === "exact") return "exact";
  if (d.geoSource === "auto") return "auto";
  return "unresolved";
}

export function TableRow({
  agreement,
  state,
  store,
  isSelectedRow,
  isSelectedUni,
  isCompared,
  onToggleCompare,
  onSelect,
  onDoubleClick,
  onOpenDetails,
  visibility,
  grantCategories,
  now,
}: {
  agreement: Agreement;
  state: StoreState;
  store: RecordStore;
  isSelectedRow: boolean;
  isSelectedUni: boolean;
  isCompared: boolean;
  onToggleCompare: (uniKey: string) => void;
  onSelect: (a: Agreement) => void;
  onDoubleClick: (uniKey: string) => void;
  onOpenDetails: (uniKey: string) => void;
  visibility: Record<ColumnKey, boolean>;
  grantCategories?: GrantCategory[];
  now: number;
}) {
  const a = agreement;
  const grant = getGrantForCountry(a.country, grantCategories);
  const rd = state.row.get(a.id) ?? {};
  const ud = state.uni.get(a.uniKey) ?? {};
  const notes = state.notes.get(a.uniKey) ?? [];
  const links = state.links.get(a.uniKey) ?? [];
  const loc = locState(state, a.uniKey);
  const expired = a.validToTs != null && a.validToTs < now;
  const soon = !expired && a.validToTs != null && a.validToTs < now + 365 * 86400000;
  const ro = state.readOnly;

  return (
    <tr
      data-row={a.id}
      onClick={() => onSelect(a)}
      onDoubleClick={() => onDoubleClick(a.uniKey)}
      className={`cursor-pointer border-b border-slate-100 transition-colors dark:border-slate-800/80 ${
        isSelectedRow
          ? "bg-indigo-100 dark:bg-indigo-950/70"
          : isSelectedUni
            ? "bg-indigo-50 dark:bg-indigo-950/40"
            : "hover:bg-slate-50 dark:hover:bg-slate-900/60"
      } ${rd.hidden ? "opacity-50" : ""}`}
    >
      {/* Compare Checkbox */}
      <td className="w-8 px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isCompared}
          onChange={() => onToggleCompare(a.uniKey)}
          title="Select university for side-by-side comparison"
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
        />
      </td>

      {/* Priority */}
      {visibility.priority && (
        <td className="w-24 px-2 py-1.5">
          <Stars
            value={rd.priority ?? 0}
            disabled={ro}
            size="text-sm"
            onChange={(v) => store.setRow(a.id, { priority: v })}
          />
        </td>
      )}

      {/* University name */}
      {visibility.uniName && (
        <td className="px-2 py-1.5">
          <div className="font-medium leading-tight text-slate-900 hover:text-indigo-700 dark:text-slate-100 dark:hover:text-indigo-400">
            {a.uniName}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {a.uniCode}
            {ud.city && ` · ${ud.city}`}
            {ud.tags && ` · #${ud.tags.split(",").map((t) => t.trim()).filter(Boolean).join(" #")}`}
          </div>
        </td>
      )}

      {/* Country */}
      {visibility.country && (
        <td className="w-20 whitespace-nowrap px-2 py-1.5 text-slate-800 dark:text-slate-200" title={countryName(a.country)}>
          {flag(a.country)} {a.country}
        </td>
      )}

      {/* Faculty */}
      {visibility.faculty && <td className="w-20 px-2 py-1.5 text-slate-700 dark:text-slate-300">{a.faculty}</td>}

      {/* Program */}
      {visibility.program && <td className="w-28 px-2 py-1.5 text-xs text-slate-600 dark:text-slate-300">{a.program}</td>}

      {/* Valid until */}
      {visibility.validTo && (
        <td
          className={`w-24 whitespace-nowrap px-2 py-1.5 text-xs ${
            expired
              ? "font-medium text-rose-600 dark:text-rose-400"
              : soon
                ? "font-medium text-amber-600 dark:text-amber-400"
                : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {a.validTo}
          {!a.active && <div className="text-[11px] text-slate-400">inactive</div>}
        </td>
      )}

      {/* Language */}
      {visibility.language && <td className="w-28 px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300">{ud.language}</td>}

      {/* Grant / Budget */}
      {visibility.budget && (
        <td className="w-28 whitespace-nowrap px-2 py-1.5 text-xs">
          {grant ? (
            <span
              className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700 whitespace-nowrap dark:bg-indigo-950/70 dark:text-indigo-300"
              title={`${grant.name} (~${grant.monthlyAmount} €/mo)`}
            >
              ~{grant.monthlyAmount}&nbsp;€
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      {/* Status */}
      {visibility.status && (
        <td className="w-28 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
          <select
            disabled={ro}
            value={rd.status ?? ""}
            onChange={(e) => store.setRow(a.id, { status: e.target.value as RowStatus })}
            className={`w-full rounded-md border-0 px-2 py-1 text-xs font-medium ${
              STATUSES.find((s) => s.value === (rd.status ?? ""))?.cls || STATUSES[0].cls
            }`}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </td>
      )}

      {/* Notes / links */}
      {visibility.notes && (
        <td className="w-28 px-2 py-1.5 text-xs">
          <div className="inline-flex items-center gap-2">
            {notes.length > 0 && (
              <span
                className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300"
                title={[...new Set(notes.map((n) => n.category))].join(", ")}
              >
                <MessageSquareText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {notes.length}
              </span>
            )}
            {links.length > 0 && (
              <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {links.length}
              </span>
            )}
          </div>
        </td>
      )}

      {/* Location */}
      {visibility.location && (
        <td
          className="w-10 px-2 py-1.5 text-center"
          title={
            loc === "exact"
              ? "Exact match"
              : loc === "auto"
                ? `Resolved automatically${ud.geoScore != null ? ` (${ud.geoScore}%)` : ""}`
                : loc === "manual"
                  ? "Manual location"
                  : loc === "unresolved"
                    ? `Unresolved — check location${ud.geoScore != null ? ` (${ud.geoScore}%)` : ""}`
                    : "No location"
          }
        >
          {loc === "exact" ? (
            <span className="inline-flex items-center justify-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          ) : loc === "auto" ? (
            <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          ) : loc === "manual" ? (
            <span className="inline-flex items-center justify-center rounded-md bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-950/70 dark:text-violet-300">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          ) : loc === "unresolved" ? (
            <span className="inline-flex items-center justify-center rounded-md bg-rose-100 px-1.5 py-0.5 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            </span>
          )}
        </td>
      )}

      {/* Row Actions */}
      <td className="w-16 whitespace-nowrap px-1 py-1.5 text-right">
        <button
          className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title={rd.hidden ? "Show" : "Hide"}
          disabled={ro}
          onClick={(e) => {
            e.stopPropagation();
            store.setRow(a.id, { hidden: !rd.hidden });
          }}
        >
          {rd.hidden ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />}
        </button>
        <button
          className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          title="Details & notes"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(a.uniKey);
          }}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </td>
    </tr>
  );
}
