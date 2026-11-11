"use client";
import React, { useEffect, useRef } from "react";
import { Columns3, RotateCcw } from "lucide-react";
import { ALL_COLUMNS, type ColumnKey } from "@/lib/hooks/useColumnVisibility";
import { b } from "@/components/ui";

export function ColumnVisibilityList({
  visibility,
  onToggle,
  onReset,
}: {
  visibility: Record<ColumnKey, boolean>;
  onToggle: (k: ColumnKey) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 font-medium text-xs text-slate-500 uppercase tracking-wider dark:border-slate-800 dark:text-slate-400">
        <span>Table columns</span>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 text-[11px] font-normal text-indigo-600 hover:underline dark:text-indigo-400"
          title="Reset to all visible"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>
      <div className="mt-1 flex flex-col gap-1 max-h-72 overflow-y-auto py-1">
        {ALL_COLUMNS.map((col) => {
          const isChecked = visibility[col.key] ?? true;
          return (
            <label
              key={col.key}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 ${
                col.required ? "opacity-75 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={col.required}
                onChange={() => !col.required && onToggle(col.key)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
              />
              <span className="flex-1 truncate">{col.label}</span>
              {col.required && <span className="text-[10px] text-slate-400">(always)</span>}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ColumnVisibilityMenu({
  visibility,
  onToggle,
  onReset,
}: {
  visibility: Record<ColumnKey, boolean>;
  onToggle: (k: ColumnKey) => void;
  onReset: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={b("secondary", "h-[34px] cursor-pointer list-none px-2.5")}
        title="Customize visible columns"
      >
        <Columns3 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="hidden min-[640px]:inline">Columns</span>
      </summary>
      <div className="absolute right-0 z-[1100] mt-1 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <ColumnVisibilityList visibility={visibility} onToggle={onToggle} onReset={onReset} />
      </div>
    </details>
  );
}
