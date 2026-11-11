"use client";
import React from "react";
import { Eye, EyeOff } from "lucide-react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore, StoreState } from "@/lib/store";
import { STATUSES, type RowStatus } from "@/lib/types";
import { Stars } from "../ui";
import { Section } from "./DetailSection";

export function DetailAgreementsSection({
  uni,
  state,
  store,
  selectedRow,
  onSelectRow,
  collapsed,
  onToggle,
  borderTop = true,
  now,
}: {
  uni: UniGroup;
  state: StoreState;
  store: RecordStore;
  selectedRow: string | null;
  onSelectRow: (id: string) => void;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
  now: number;
}) {
  const ro = state.readOnly;

  return (
    <Section
      title={`Agreements (${uni.agreements.length})`}
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-1.5">
        {uni.agreements.map((a) => {
          const rd = state.row.get(a.id) ?? {};
          const expired = a.validToTs != null && a.validToTs < now;
          return (
            <div
              key={a.id}
              onClick={() => onSelectRow(a.id)}
              className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${
                selectedRow === a.id
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-950/50"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              } ${rd.hidden ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  <b>{a.faculty}</b> · {a.program}
                </span>
                <Stars
                  value={rd.priority ?? 0}
                  disabled={ro}
                  onChange={(v) => store.setRow(a.id, { priority: v })}
                  size="text-sm"
                />
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className={expired ? "text-rose-600 dark:text-rose-400" : ""}>
                  {a.validFrom || "?"} → {a.validTo || "?"}
                </span>
                {!a.active && <span className="rounded bg-slate-200 px-1 dark:bg-slate-700">inactive</span>}
                <select
                  className="ml-auto rounded border border-slate-200 bg-white px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900"
                  value={rd.status ?? ""}
                  disabled={ro}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => store.setRow(a.id, { status: e.target.value as RowStatus })}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex items-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  disabled={ro}
                  title={rd.hidden ? "Show" : "Hide"}
                  onClick={(e) => {
                    e.stopPropagation();
                    store.setRow(a.id, { hidden: !rd.hidden });
                  }}
                >
                  {rd.hidden ? (
                    <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                  ) : (
                    <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
