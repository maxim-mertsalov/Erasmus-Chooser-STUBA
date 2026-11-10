// Core domain types shared across the app.

/** Logical fields we need from the source agreements sheet. */
export type FieldKey =
  | "faculty"
  | "program"
  | "country"
  | "uniCode"
  | "uniName"
  | "validFrom"
  | "validTo"
  | "active";

/** Maps each logical field to a column index in the source sheet (or -1 if absent). */
export type ColumnMapping = Record<FieldKey, number>;

/** One agreement row from the source sheet (read-only data). */
export interface Agreement {
  /** Stable key for this row (used for row-level custom data). */
  id: string;
  /** Key of the partner university (used for university-level custom data). */
  uniKey: string;
  faculty: string;
  program: string;
  /** Country code as written in the sheet (e.g. "AT", "EL"). */
  country: string;
  uniCode: string;
  uniName: string;
  validFrom: string;
  validTo: string;
  /** Parsed validTo as a timestamp (ms) or null. */
  validToTs: number | null;
  active: boolean;
  /** 1-based row number in the source sheet. */
  sourceRow: number;
}

export type GeoSource = "auto" | "approx" | "manual" | "failed";

export interface UniData {
  language?: string;
  city?: string;
  costOfLiving?: "" | "low" | "medium" | "high";
  tags?: string;
  lat?: number;
  lon?: number;
  geoSource?: GeoSource;
  geoLabel?: string;
}

export type RowStatus = "" | "interested" | "shortlisted" | "applied" | "accepted" | "rejected";

export interface RowData {
  priority?: number; // 0..5
  hidden?: boolean;
  status?: RowStatus;
}

export interface NoteData {
  uniKey: string;
  category: string;
  text: string;
  author?: string;
  createdAt?: string;
  deleted?: boolean;
}

export interface LinkData {
  uniKey: string;
  label: string;
  url: string;
  deleted?: boolean;
}

export interface SetupConfig {
  sheetName: string;
  mapping: ColumnMapping;
  headerRow: number; // 0-based index of header row
}

export type RecordType = "uni" | "row" | "note" | "link" | "config";

/** A single persisted record in the app's storage sheet. */
export interface StoredRecord {
  key: string;
  type: RecordType;
  data: Record<string, unknown>;
  updatedAt: string;
  updatedBy: string;
}

export interface Filters {
  search: string;
  faculties: string[];
  programs: string[];
  countries: string[];
  statuses: string[];
  minPriority: number;
  language: string;
  noteCategory: string;
  tag: string;
  showHidden: boolean;
  onlyActive: boolean;
  hideExpired: boolean;
  location: "" | "missing" | "approx" | "ok";
}

export const NOTE_CATEGORIES = [
  "Accommodation",
  "Courses",
  "Difficulty",
  "Costs",
  "City & life",
  "Admin & documents",
  "Language",
  "Other",
];

export const STATUSES: { value: RowStatus; label: string; cls: string }[] = [
  { value: "", label: "—", cls: "" },
  { value: "interested", label: "Interested", cls: "bg-sky-100 text-sky-800" },
  { value: "shortlisted", label: "Shortlisted", cls: "bg-violet-100 text-violet-800" },
  { value: "applied", label: "Applied", cls: "bg-amber-100 text-amber-800" },
  { value: "accepted", label: "Accepted", cls: "bg-emerald-100 text-emerald-800" },
  { value: "rejected", label: "Rejected", cls: "bg-rose-100 text-rose-800" },
];
