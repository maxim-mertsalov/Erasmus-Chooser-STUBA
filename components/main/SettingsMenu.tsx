"use client";
import React, { useRef } from "react";
import {
  Coins,
  Columns3,
  Download,
  ExternalLink,
  Layers,
  MoreHorizontal,
  MousePointerClick,
  Share2,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import type { Source } from "@/lib/session";
import type { StoreState } from "@/lib/store";
import { b } from "@/components/ui";
import { useUIStore } from "@/lib/stores/uiStore";
import { SyncBadge } from "./SyncBadge";

export function SettingsMenu({
  source,
  state,
  readOnly,
  onEditSetup,
  onOpenColumnMenu,
  onOpenBudgetEditor,
  onShareLink,
  onOpenExport,
  onSuperImport,
  onRetrySync,
  onReconnect,
  onCloseFile,
}: {
  source: Source;
  state: StoreState;
  readOnly: boolean;
  onEditSetup: () => void;
  onOpenColumnMenu?: () => void;
  onOpenBudgetEditor?: () => void;
  onShareLink?: () => void;
  onOpenExport: () => void;
  onSuperImport: (file: File) => void;
  onRetrySync: () => void;
  onReconnect: () => void;
  onCloseFile: () => void;
}) {
  const [ui, uiStoreActions] = useUIStore();
  const menuRef = useRef<HTMLDetailsElement>(null);

  const close = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <details ref={menuRef} className="relative">
      <summary className={b("secondary", "h-[34px] cursor-pointer list-none px-2.5")} title="More actions">
        <MoreHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      </summary>
      <div className="absolute right-0 z-[1100] mt-1 flex w-64 max-w-[calc(100vw-1rem)] flex-col rounded-lg border border-slate-200 bg-white p-1 text-sm text-slate-700 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        <div className="px-2 py-1.5 min-[880px]:hidden">
          <SyncBadge state={state} onRetry={onRetrySync} onReconnect={onReconnect} />
        </div>

        {/* Faculties & programs is now permanently in the menu */}
        <button
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => {
            close();
            onEditSetup();
          }}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          <span>Faculties & programs</span>
        </button>

        {/* Columns customization (on mobile/tablets where hidden from top bar) */}
        {onOpenColumnMenu && (
          <div className="min-[1110px]:hidden">
            <button
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => {
                close();
                onOpenColumnMenu();
              }}
            >
              <Columns3 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span>Customize columns</span>
            </button>
          </div>
        )}

        {/* Erasmus grant rate editor */}
        {onOpenBudgetEditor && (
          <button
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => {
              close();
              onOpenBudgetEditor();
            }}
          >
            <Coins className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
            <span>Erasmus Grants & Budgets</span>
          </button>
        )}

        {source.kind === "google" && onShareLink && (
          <div className="min-[880px]:hidden">
            <button
              className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => {
                close();
                onShareLink();
              }}
            >
              <Share2 className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
              <span>Share link</span>
            </button>
          </div>
        )}

        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* Open details on click toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={ui.openOnClick}
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => uiStoreActions.setOpenOnClick((v) => !v)}
        >
          <MousePointerClick className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          <span className="flex-1">Open details on click</span>
          <span
            className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              ui.openOnClick ? "bg-indigo-600 dark:bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full bg-white transition-transform ${
                ui.openOnClick ? "translate-x-3" : "translate-x-0"
              }`}
            />
          </span>
        </button>

        {/* Cluster map markers toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={ui.clusterMarkers}
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => uiStoreActions.setClusterMarkers((v) => !v)}
        >
          <Layers className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          <span className="flex-1">Group map points</span>
          <span
            className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              ui.clusterMarkers ? "bg-indigo-600 dark:bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full bg-white transition-transform ${
                ui.clusterMarkers ? "translate-x-3" : "translate-x-0"
              }`}
            />
          </span>
        </button>

        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

        {/* Unified Export Button */}
        <button
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => {
            close();
            onOpenExport();
          }}
        >
          <Download className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
          <span>Export data…</span>
        </button>

        {/* Super Import: accepts .xlsx, .xls, .csv, .json */}
        {!readOnly && (
          <label className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
            <Upload className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
            <span>Import (.xlsx, .csv, .json)</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.ods,.json"
              className="hidden"
              onChange={(e) => {
                close();
                if (e.target.files?.[0]) onSuperImport(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}

        {source.kind === "google" && (
          <a
            className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
            target="_blank"
            rel="noreferrer"
            href={`https://docs.google.com/spreadsheets/d/${source.spreadsheetId}/edit`}
            onClick={close}
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
            <span>Open in Google Sheets</span>
          </a>
        )}

        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

        <button
          className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
          onClick={() => {
            close();
            onCloseFile();
          }}
        >
          <X className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>Close file</span>
        </button>
      </div>
    </details>
  );
}
