// Country code helpers. Erasmus uses a few non-ISO codes (EL, UK).

const ERASMUS_TO_ISO: Record<string, string> = { EL: "GR", UK: "GB" };

export function toIso2(code: string): string {
  const c = (code || "").trim().toUpperCase();
  return ERASMUS_TO_ISO[c] ?? c;
}

let displayNames: Intl.DisplayNames | null = null;

export function countryName(code: string): string {
  const iso = toIso2(code);
  if (!/^[A-Z]{2}$/.test(iso)) return code;
  try {
    displayNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(iso) ?? code;
  } catch {
    return code;
  }
}

/** Unicode flag emoji for a country code. */
export function flag(code: string): string {
  const iso = toIso2(code);
  if (!/^[A-Z]{2}$/.test(iso)) return "";
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
