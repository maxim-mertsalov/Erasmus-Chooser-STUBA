"use client";
import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  GraduationCap,
  Map as MapIcon,
  Share2,
  Table2,
} from "lucide-react";
import type { Source } from "@/lib/session";
import type { StoreState } from "@/lib/store";
import type { ColumnKey } from "@/lib/hooks/useColumnVisibility";
import { b } from "@/components/ui";
import { useUIStore } from "@/lib/stores/uiStore";
import { SyncBadge } from "./SyncBadge";
import { SettingsMenu } from "./SettingsMenu";
import { ColumnVisibilityMenu } from "./ColumnVisibilityMenu";

export function TopBar({
  source,
  state,
  sortedCount,
  baseCount,
  uniCount,
  isMobile,
  activeFilterCount,
  columnVisibility,
  onToggleColumn,
  onResetColumns,
  onEditSetup,
  onOpenBudgetEditor,
  onShareLink,
  onOpenExport,
  onSuperImport,
  onRetrySync,
  onReconnect,
  onClose,
}: {
  source: Source;
  state: StoreState;
  sortedCount: number;
  baseCount: number;
  uniCount: number;
  isMobile: boolean;
  activeFilterCount: number;
  columnVisibility: Record<ColumnKey, boolean>;
  onToggleColumn: (k: ColumnKey) => void;
  onResetColumns: () => void;
  onEditSetup: () => void;
  onOpenBudgetEditor?: () => void;
  onShareLink?: () => void;
  onOpenExport: () => void;
  onSuperImport: (f: File) => void;
  onRetrySync: () => void;
  onReconnect: () => void;
  onClose: () => void;
}) {
  const [ui, uiStoreActions] = useUIStore();
  const [showMobileColumnMenu, setShowMobileColumnMenu] = useState(false);

  return (
    <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2 sm:px-3 dark:border-slate-800 dark:bg-slate-900">
      <button
        className={b("ghost", "shrink-0 px-2 text-indigo-600 dark:text-indigo-400")}
        onClick={onClose}
        title="Back to start screen"
      >
        <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1 min-[580px]:flex-initial">
        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
          {source.kind === "google" ? source.title : source.fileName}
        </div>
        <div className="truncate text-xs text-slate-500 dark:text-slate-400">
          {sortedCount}/{baseCount}{" "}
          <span className="hidden min-[580px]:inline">agreements · {uniCount} universities</span>
        </div>
      </div>

      <div className="hidden min-[880px]:block">
        <SyncBadge state={state} onRetry={onRetrySync} onReconnect={onReconnect} />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* View Switcher */}
        {isMobile ? (
          <button
            type="button"
            onClick={() => uiStoreActions.setMobileTab(ui.mobileTab === "table" ? "map" : "table")}
            className="inline-flex h-[34px] overflow-hidden rounded-md border border-slate-300 text-sm font-medium dark:border-slate-700"
            title="Switch between Table and Map"
          >
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 ${
                ui.mobileTab === "table"
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <Table2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden min-[580px]:inline">Table</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 border-l border-slate-300 px-2.5 dark:border-slate-700 ${
                ui.mobileTab === "map"
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <MapIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span className="hidden min-[580px]:inline">Map</span>
            </span>
          </button>
        ) : (
          <div className="inline-flex h-[34px] overflow-hidden rounded-md border border-slate-300 text-sm font-medium dark:border-slate-700">
            <button
              className={`inline-flex items-center gap-1.5 px-3 ${
                ui.desktopTable
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => (ui.desktopTable && !ui.desktopMap ? null : uiStoreActions.setDesktopTable(!ui.desktopTable))}
            >
              <Table2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Table</span>
            </button>
            <button
              className={`inline-flex items-center gap-1.5 border-l border-slate-300 px-3 dark:border-slate-700 ${
                ui.desktopMap
                  ? "bg-indigo-600 text-white dark:bg-indigo-500"
                  : "bg-white text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => (ui.desktopMap && !ui.desktopTable ? null : uiStoreActions.setDesktopMap(!ui.desktopMap))}
            >
              <MapIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Map</span>
            </button>
          </div>
        )}

        {/* Filter toggle */}
        <button
          className={b(
            "secondary",
            `h-[34px] px-2.5 min-[580px]:px-3 ${
              ui.showFilters || activeFilterCount > 0
                ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300"
                : ""
            }`,
          )}
          onClick={() => uiStoreActions.setShowFilters((v) => !v)}
          title="Show or hide search and detailed filters"
        >
          <Filter className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span className="hidden min-[580px]:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded bg-indigo-600 px-1.5 text-xs text-white">{activeFilterCount}</span>
          )}
          {ui.showFilters ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          )}
        </button>

        {/* Column visibility menu (Desktop only, >= 1110px) */}
        <div className="hidden min-[1110px]:flex">
          <ColumnVisibilityMenu
            visibility={columnVisibility}
            onToggle={onToggleColumn}
            onReset={onResetColumns}
          />
        </div>

        {/* Share link (Google Sheets) */}
        {source.kind === "google" && onShareLink && (
          <div className="hidden items-center gap-1.5 min-[880px]:flex">
            <button className={b("secondary", "h-[34px]")} onClick={onShareLink} title="Copy a link for friends">
              <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Share</span>
            </button>
          </div>
        )}

        {/* More actions menu */}
        <SettingsMenu
          source={source}
          state={state}
          readOnly={state.readOnly}
          onEditSetup={onEditSetup}
          onOpenColumnMenu={() => setShowMobileColumnMenu(true)}
          onOpenBudgetEditor={onOpenBudgetEditor}
          onShareLink={onShareLink}
          onOpenExport={onOpenExport}
          onSuperImport={onSuperImport}
          onRetrySync={onRetrySync}
          onReconnect={onReconnect}
          onCloseFile={onClose}
        />
      </div>

      {/* Mobile/Tablet Column Visibility Dialog */}
      {showMobileColumnMenu && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs min-[1110px]:hidden">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Table Columns</h3>
              <button
                type="button"
                onClick={() => setShowMobileColumnMenu(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="mt-2">
              <ColumnVisibilityMenu
                visibility={columnVisibility}
                onToggle={onToggleColumn}
                onReset={onResetColumns}
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowMobileColumnMenu(false)}
                className={b("primary", "py-1 text-xs")}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
