"use client";
import React from "react";
import { AlertTriangle, Check, Eye, HardDrive } from "lucide-react";
import type { StoreState } from "@/lib/store";
import { Spinner } from "@/components/ui";

export function SyncBadge({
  state,
  onRetry,
  onReconnect,
}: {
  state: StoreState;
  onRetry: () => void;
  onReconnect: () => void;
}) {
  if (state.kind === "local") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <HardDrive className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>Saved in this browser</span>
      </span>
    );
  }

  if (state.readOnly) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>View only</span>
      </span>
    );
  }

  switch (state.status) {
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
          <Spinner className="h-3 w-3" /> Saving…
        </span>
      );
    case "auth":
      return (
        <button
          className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950"
          onClick={onReconnect}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Session expired — reconnect</span>
        </button>
      );
    case "error":
      return (
        <button
          className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:hover:bg-rose-950"
          onClick={onRetry}
          title={state.error}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Sync error — retry</span>
        </button>
      );
    default:
      return (
        <span
          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          title={`Last sync ${new Date(state.lastSync).toLocaleTimeString()}`}
        >
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Synced with Google Sheets</span>
        </span>
      );
  }
}
