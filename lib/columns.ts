// Column auto-detection and conversion of raw sheet rows into Agreements.
import type { Agreement, ColumnMapping, FieldKey } from "./types";

export const FIELD_LABELS: Record<FieldKey, { label: string; required: boolean }> = {
  faculty: { label: "Faculty", required: true },
  program: { label: "Program type", required: true },
  country: { label: "Country code", required: false },
  uniCode: { label: "University code", required: false },
  uniName: { label: "University name", required: true },
  validFrom: { label: "Valid from", required: false },
  validTo: { label: "Valid until", required: false },
  active: { label: "Active flag", required: false },
};

// Header synonyms, most specific first. Compared after normalisation.
const SYNONYMS: Record<FieldKey, string[]> = {
  faculty: ["fak", "faculty", "fakulta skratka", "fakulta", "faculty code", "department"],
  program: ["druh dohody", "druh", "program", "programme", "program type", "agreement type", "type"],
  country: ["stat", "country", "country code", "krajina", "zeme"],
  uniCode: ["kod", "erasmus code", "code", "university code", "institution code", "pic"],
  uniName: ["zahr partner", "partner", "university", "university name", "institution", "name", "nazov"],
  validFrom: ["od kedy", "od", "from", "valid from", "start", "start date"],
  validTo: ["do kedy", "do", "to", "valid to", "valid until", "until", "end", "end date", "expiry"],
  active: ["aktivna", "aktivny", "active", "is active", "status"],
};

export function normalizeHeader(h: string): string {
  return (h ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function emptyMapping(): ColumnMapping {
  return { faculty: -1, program: -1, country: -1, uniCode: -1, uniName: -1, validFrom: -1, validTo: -1, active: -1 };
}

/** Find the header row (first row with >= 3 non-empty cells among the first 10). */
export function detectHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if ((rows[i] ?? []).filter((c) => String(c ?? "").trim()).length >= 3) return i;
  }
  return 0;
}

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const norm = headers.map(normalizeHeader);
  const m = emptyMapping();
  const used = new Set<number>();
  (Object.keys(SYNONYMS) as FieldKey[]).forEach((field) => {
    for (const syn of SYNONYMS[field]) {
      const idx = norm.findIndex((h, i) => !used.has(i) && h === syn);
      if (idx >= 0) {
        m[field] = idx;
        used.add(idx);
        return;
      }
    }
  });
  return m;
}

export function isMappingValid(m: ColumnMapping): boolean {
  return (Object.keys(FIELD_LABELS) as FieldKey[]).every((f) => !FIELD_LABELS[f].required || m[f] >= 0);
}

/** Parse dd.mm.yyyy, yyyy-mm-dd, d/m/yyyy or Excel serial numbers. */
export function parseDate(v: string): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  let m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  if (/^\d{5}(\.\d+)?$/.test(s)) return Math.round((+s - 25569) * 86400000); // Excel serial
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export function makeUniKey(code: string, name: string, country: string): string {
  const c = collapse(code).toUpperCase();
  if (c) return `code:${c}`;
  return `name:${collapse(country).toUpperCase()}:${collapse(name).toLowerCase()}`;
}

function isTruthy(v: string): boolean {
  const s = normalizeHeader(v);
  if (!s) return true; // missing value => treat as active
  return !["0", "false", "no", "nie", "ne", "n", "inactive", "neaktivna"].includes(s);
}

export function rowsToAgreements(rows: string[][], headerRow: number, m: ColumnMapping): Agreement[] {
  const get = (r: string[], i: number) => (i >= 0 ? collapse(String(r[i] ?? "")) : "");
  const seen = new Map<string, number>();
  const out: Agreement[] = [];
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const uniName = get(r, m.uniName);
    if (!uniName && !get(r, m.uniCode)) continue;
    const faculty = get(r, m.faculty);
    const program = get(r, m.program);
    const country = get(r, m.country).toUpperCase();
    const uniCode = get(r, m.uniCode);
    const uniKey = makeUniKey(uniCode, uniName, country);
    const base = `${faculty}|${program}|${uniKey}|${uniName.toLowerCase()}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const validTo = get(r, m.validTo);
    out.push({
      id: n > 1 ? `${base}#${n}` : base,
      uniKey,
      faculty,
      program,
      country,
      uniCode,
      uniName,
      validFrom: get(r, m.validFrom),
      validTo,
      validToTs: parseDate(validTo),
      active: m.active >= 0 ? isTruthy(get(r, m.active)) : true,
      sourceRow: i + 1,
    });
  }
  return out;
}
