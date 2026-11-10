"use client";
// Session persistence (what file/sheet/filters the user had open) and local .xlsx parsing.
import type { ColumnMapping, Filters } from "./types";

export type Source =
  | { kind: "google"; spreadsheetId: string; title: string; readOnly: boolean }
  | { kind: "local"; fileName: string };

export interface Session {
  source: Source;
  sheetName?: string;
  headerRow?: number;
  mapping?: ColumnMapping;
  filters?: Filters;
}

const SESSION_KEY = "erasmus-session-v1";

export function loadSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function saveSession(s: Session | null) {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESSION_KEY);
}

export function defaultFilters(): Filters {
  return {
    search: "",
    faculties: [],
    programs: [],
    countries: [],
    statuses: [],
    minPriority: 0,
    language: "",
    noteCategory: "",
    tag: "",
    showHidden: false,
    onlyActive: true,
    hideExpired: false,
    location: "",
  };
}

// ---------- Local workbook ----------

export type Workbook = Record<string, string[][]>; // sheet name -> rows

const localFileKey = (fileName: string) => `erasmus-localfile:${fileName}`;

export async function parseWorkbook(buf: ArrayBuffer): Promise<Workbook> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });
  const out: Workbook = {};
  for (const name of wb.SheetNames) {
    out[name] = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
  }
  return out;
}

export function saveLocalWorkbook(fileName: string, wb: Workbook) {
  try {
    localStorage.setItem(localFileKey(fileName), JSON.stringify(wb));
  } catch {
    console.warn("Workbook too large for localStorage; it will need to be re-uploaded after reload.");
  }
}

export function loadLocalWorkbook(fileName: string): Workbook | null {
  try {
    return JSON.parse(localStorage.getItem(localFileKey(fileName)) ?? "null");
  } catch {
    return null;
  }
}

export const localRecordsKey = (fileName: string) => `erasmus-localrecords:${fileName}`;
