"use client";
import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { b, Modal } from "@/components/ui";

export function ExportModal({
  isOpen,
  onClose,
  onExportJson,
  onExportCsv,
  agreementCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
  agreementCount: number;
}) {
  if (!isOpen) return null;

  return (
    <Modal title="Export Data" onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-3 text-sm text-slate-700 dark:text-slate-300">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose what and how you want to export from the application:
        </p>

        <button
          type="button"
          onClick={() => {
            onExportJson();
            onClose();
          }}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
        >
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Notes & Custom Data (.json)</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Saves all your notes, priorities, tags, links, and locations. Can be imported back anytime.
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            onExportCsv();
            onClose();
          }}
          className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-emerald-400 hover:bg-emerald-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/40"
        >
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100">Agreements Table (.csv)</div>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Exports the current filtered view ({agreementCount} agreements) as a spreadsheet for Excel or Google Sheets.
            </div>
          </div>
        </button>

        <div className="mt-2 flex justify-end">
          <button type="button" onClick={onClose} className={b("ghost", "py-1 text-xs")}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
