"use client";
import React from "react";
import { Scale, Trash2 } from "lucide-react";

export function ComparisonFloatingBar({
  count,
  onOpen,
  onClear,
}: {
  count: number;
  onOpen: () => void;
  onClear: () => void;
}) {
  if (count < 2) return null;

  return (
    <div className="fixed bottom-10 left-1/2 z-[1000] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center gap-3 rounded-full border border-indigo-200 bg-white/95 px-4 py-2 text-sm text-slate-800 shadow-2xl backdrop-blur-md dark:border-indigo-900/80 dark:bg-slate-900/95 dark:text-slate-100">
        <div className="flex items-center gap-2 font-medium">
          <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span>
            Selected for comparison: <b className="text-indigo-600 dark:text-indigo-400">{count}</b>
          </span>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Compare
        </button>
        <button
          type="button"
          onClick={onClear}
          title="Clear selected universities"
          className="rounded-full p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
