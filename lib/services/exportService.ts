"use client";
import type { Agreement, StoredRecord } from "@/lib/types";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportNotesJson(records: StoredRecord[], filename = "erasmus-notes.json") {
  const jsonStr = JSON.stringify(records, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function exportAgreementsCsv(agreements: Agreement[], filename = "erasmus-agreements.csv") {
  const headers = [
    "University",
    "Country",
    "Erasmus Code",
    "Faculty",
    "Program",
    "Valid From",
    "Valid To",
    "Active",
  ];

  const escapeCell = (val: unknown) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = agreements.map((a) => [
    escapeCell(a.uniName),
    escapeCell(a.country),
    escapeCell(a.uniCode),
    escapeCell(a.faculty),
    escapeCell(a.program),
    escapeCell(a.validFrom),
    escapeCell(a.validTo),
    escapeCell(a.active ? "Yes" : "No"),
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export async function parseImportFile(file: File): Promise<StoredRecord[]> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid file format: root item must be an array of records.");
  }
  return parsed as StoredRecord[];
}
