"use client";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PageSizeOption } from "@/lib/hooks/usePagination";

export function PaginationBar({
  page,
  setPage,
  pageSize,
  setPageSize,
  totalPages,
  totalItems,
  showingCount,
}: {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSize: PageSizeOption;
  setPageSize: (s: PageSizeOption) => void;
  totalPages: number;
  totalItems: number;
  showingCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <div className="flex items-center gap-1.5">
        <span>Rows:</span>
        <div className="inline-flex rounded-md border border-slate-200 text-xs dark:border-slate-700">
          {(["all", 25, 50, 100] as PageSizeOption[]).map((opt) => (
            <button
              key={String(opt)}
              type="button"
              onClick={() => setPageSize(opt)}
              className={`px-2 py-0.5 transition ${
                pageSize === opt
                  ? "bg-indigo-600 font-semibold text-white dark:bg-indigo-500"
                  : "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800"
              }`}
            >
              {opt === "all" ? "All" : opt}
            </button>
          ))}
        </div>
        <span className="text-slate-400">
          ({showingCount} of {totalItems})
        </span>
      </div>

      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-slate-700 dark:text-slate-300">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
