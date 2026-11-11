"use client";
import type { Workbook } from "@/lib/session";

/**
 * Asynchronously parses a spreadsheet buffer without blocking the main browser thread.
 * Yields between sheets to allow the UI to remain responsive and show spinners.
 */
export async function parseSpreadsheetAsync(
  buf: ArrayBuffer,
  onProgress?: (sheetName: string, index: number, total: number) => void,
): Promise<Workbook> {
  // Dynamic import keeps the initial page bundle light
  const XLSX = await import("xlsx");

  // Allow the UI to paint the "Reading..." spinner before heavy CPU parsing begins
  await new Promise((resolve) => setTimeout(resolve, 10));

  const wb = XLSX.read(buf, { type: "array" });
  const out: Workbook = {};
  const totalSheets = wb.SheetNames.length;

  for (let i = 0; i < totalSheets; i++) {
    const name = wb.SheetNames[i];
    onProgress?.(name, i + 1, totalSheets);

    // Yield control to the browser event loop between sheets
    await new Promise((resolve) => setTimeout(resolve, 0));

    out[name] = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
  }

  return out;
}
