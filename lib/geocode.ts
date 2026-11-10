"use client";
// Client-side geocoding chain for partner universities (free OSM services via /api/geocode)
// with fuzzy + distinctive-token similarity scoring so generic words like
// "University of Applied Sciences" don't falsely match unrelated institutions.
import { toIso2 } from "./countries";

export interface GeoHit {
  lat: number;
  lon: number;
  label: string;
  kind: string;
  countryCode: string;
}

const CACHE_KEY = "erasmus-geocache-v1";
let cache: Record<string, GeoHit[]> | null = null;

function loadCache() {
  if (!cache) {
    try {
      cache = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
    } catch {
      cache = {};
    }
  }
  return cache!;
}

export async function geocode(
  q: string,
  opts: { cc?: string; provider?: "nominatim" | "photon"; places?: boolean } = {},
): Promise<GeoHit[]> {
  const provider = opts.provider ?? "nominatim";
  const cc = opts.cc ? toIso2(opts.cc) : "";
  const key = `${provider}|${cc}|${opts.places ? 1 : 0}|${q.toLowerCase()}`;
  const c = loadCache();
  if (c[key]) return c[key];
  const params = new URLSearchParams({ q, provider });
  if (cc) params.set("cc", cc);
  if (opts.places) params.set("places", "1");
  const res = await fetch(`/api/geocode?${params}`);
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
  const { results } = (await res.json()) as { results: GeoHit[] };
  c[key] = results;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota */
  }
  return results;
}

/** City name hidden in an Erasmus code, e.g. "E MADRID05" -> "MADRID", "SI LJUBLJA01" -> "LJUBLJA". */
export function cityFromErasmusCode(code: string): string {
  const parts = code.trim().split(/\s+/);
  if (parts.length < 2) return "";
  return parts[parts.length - 1].replace(/\d+$/, "").replace(/[^A-Za-z-]/g, "");
}

const PREFER = /universit|college|school|education|research|institute|hochschule|fachhochschule|amenity:/i;

// Generic boilerplate words that appear in many university names and should not dominate matching.
const GENERIC_WORDS = new Set([
  "university",
  "universitat",
  "universitaet",
  "universite",
  "universita",
  "universidad",
  "universidade",
  "univerzita",
  "uniwersytet",
  "universityof",
  "applied",
  "science",
  "sciences",
  "technical",
  "technische",
  "technicka",
  "technology",
  "technologii",
  "institute",
  "institut",
  "college",
  "school",
  "academy",
  "faculty",
  "fakulta",
  "department",
  "hochschule",
  "fachhochschule",
  "polytechnic",
  "politechnika",
  "politecnico",
  "politecnica",
  "national",
  "state",
  "of",
  "for",
  "and",
  "the",
  "in",
  "at",
  "on",
  "de",
  "la",
  "le",
  "les",
  "di",
  "del",
  "della",
  "der",
  "des",
  "und",
  "fuer",
  "fur",
  "v",
  "na",
  "w",
  "z",
  "do",
  "gmbh",
  "oy",
  "ab",
  "as",
]);

function normText(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normText(s)
    .split(" ")
    .filter((w) => w.length >= 2);
}

function distinctiveTokens(s: string): string[] {
  return tokenize(s).filter((w) => !GENERIC_WORDS.has(w));
}

function diceSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const ma = bigrams(a);
  const mb = bigrams(b);
  let overlap = 0;
  for (const [bg, ca] of ma) overlap += Math.min(ca, mb.get(bg) ?? 0);
  return (2 * overlap) / (a.length - 1 + (b.length - 1));
}

function tokenMatch(qTok: string, targetToks: string[]): boolean {
  return targetToks.some((t) => {
    if (t === qTok) return true;
    if (qTok.length >= 4 && t.length >= 4 && (t.startsWith(qTok) || qTok.startsWith(t))) return true;
    return qTok.length >= 5 && t.length >= 5 && diceSimilarity(qTok, t) >= 0.8;
  });
}

/** Returns similarity 0..1 between the university name query and a geocoder result. */
export function scoreGeoHit(queryName: string, hit: GeoHit): number {
  const qNorm = normText(queryName);
  const primary = hit.label.split(",")[0] ?? hit.label;
  const pNorm = normText(primary);
  if (!qNorm || !pNorm) return 0;
  if (qNorm === pNorm) return 1;

  const qAll = tokenize(queryName);
  const pAll = tokenize(primary);
  const lAll = tokenize(hit.label);

  const qDist = distinctiveTokens(queryName);
  const pDist = distinctiveTokens(primary);

  // Exact distinctive token set match inside the primary name
  if (
    qDist.length > 0 &&
    qDist.length === pDist.length &&
    qDist.every((t) => tokenMatch(t, pDist)) &&
    pDist.every((t) => tokenMatch(t, qDist))
  ) {
    return 1;
  }

  const refTokens = qDist.length > 0 ? qDist : qAll;
  const matchedPrimary = refTokens.filter((t) => tokenMatch(t, pAll)).length / refTokens.length;
  const matchedLabel = refTokens.filter((t) => tokenMatch(t, lAll)).length / refTokens.length;
  const dice = diceSimilarity(qNorm, pNorm);

  // If zero distinctive words matched anywhere in the candidate label (e.g. "Jade" vs "TU Munich"),
  // penalize heavily so generic words ("University", "Applied Sciences") don't falsely pass.
  if (qDist.length > 0 && matchedLabel === 0) {
    return Math.min(0.35, dice * 0.45);
  }

  const isEdu = PREFER.test(hit.kind) || PREFER.test(hit.label);
  const eduBonus = isEdu ? 0.06 : 0;
  // High recall on distinctive tokens in primary name + bigram similarity
  const raw = 0.52 * matchedPrimary + 0.16 * matchedLabel + 0.32 * dice + eduBonus;
  return Math.min(0.99, Math.max(0, raw));
}

export interface LocateResult {
  lat: number;
  lon: number;
  label: string;
  source: "exact" | "auto" | "unresolved";
  score: number; // 0..100
}

/** Tries several strategies and scores candidates against the university name. */
export async function autoLocate(name: string, country: string, code: string): Promise<LocateResult | null> {
  const variants = [
    name,
    name.split(",")[0],
    name.replace(/\(.*?\)/g, " "),
    name.split(/\s[-–]\s/)[0],
  ]
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v, i, a) => v.length > 3 && a.indexOf(v) === i);

  const collected: GeoHit[] = [];
  let bestHit: GeoHit | null = null;
  let bestScore = -1;

  const consider = (hits: GeoHit[]) => {
    for (const h of hits) {
      collected.push(h);
      const s = scoreGeoHit(name, h);
      if (s > bestScore) {
        bestScore = s;
        bestHit = h;
      }
    }
  };

  for (const v of variants) {
    const hits = await geocode(v, { cc: country });
    consider(hits);
    if (bestScore >= 0.95) break;
  }

  // Photon handles fuzzy/multilingual names well.
  if (bestScore < 0.95) {
    const ph = await geocode(variants[0] ?? name, { cc: country, provider: "photon" });
    consider(ph);
  }

  // If distinctive words didn't match yet (e.g. English vs native "Jade Hochschule"),
  // try searching just the distinctive tokens + city hint from Erasmus code.
  const qDist = distinctiveTokens(variants[0] ?? name);
  const city = cityFromErasmusCode(code);
  if (bestScore < 0.65 && qDist.length >= 1 && qDist.length <= 3) {
    const shortQ = city.length >= 3 && !qDist.some((t) => tokenMatch(t, [city.toLowerCase()]))
      ? `${qDist.join(" ")} ${city}`
      : qDist.join(" ");
    const hits = await geocode(shortQ, { cc: country, provider: "photon" });
    consider(hits);
  }

  if (bestHit && bestScore >= 0.95) {
    const h: GeoHit = bestHit;
    return { lat: h.lat, lon: h.lon, label: h.label, source: "exact", score: 100 };
  }

  if (bestHit && bestScore >= 0.65) {
    const h: GeoHit = bestHit;
    return { lat: h.lat, lon: h.lon, label: h.label, source: "auto", score: Math.round(bestScore * 100) };
  }

  // Below 65%: unresolved — pick the first search result (or city fallback if no search hit).
  if (collected.length > 0) {
    const fallback = bestScore >= 0.45 && bestHit ? bestHit : collected[0];
    const scorePct = Math.round(Math.max(0, scoreGeoHit(name, fallback)) * 100);
    return { lat: fallback.lat, lon: fallback.lon, label: fallback.label, source: "unresolved", score: scorePct };
  }

  if (city.length >= 3) {
    const hit = (await geocode(city, { cc: country, provider: "photon", places: true }))[0];
    if (hit) {
      return { lat: hit.lat, lon: hit.lon, label: `≈ ${hit.label}`, source: "unresolved", score: 0 };
    }
  }

  return null;
}
