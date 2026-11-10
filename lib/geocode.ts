"use client";
// Client-side geocoding chain for partner universities (free OSM services via /api/geocode).
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

const PREFER = /universit|college|school|education|research|institute|amenity:/i;

function pick(hits: GeoHit[]): GeoHit | null {
  return hits.find((h) => PREFER.test(h.kind) || PREFER.test(h.label)) ?? hits[0] ?? null;
}

export interface LocateResult {
  lat: number;
  lon: number;
  label: string;
  source: "auto" | "approx";
}

/** Tries several strategies; returns null if nothing was found. */
export async function autoLocate(name: string, country: string, code: string): Promise<LocateResult | null> {
  const variants = [
    name,
    name.split(",")[0],
    name.replace(/\(.*?\)/g, " "),
    name.split(/\s[-–]\s/)[0],
  ]
    .map((v) => v.replace(/\s+/g, " ").trim())
    .filter((v, i, a) => v.length > 3 && a.indexOf(v) === i);

  for (const v of variants) {
    const hit = pick(await geocode(v, { cc: country }));
    if (hit) return { lat: hit.lat, lon: hit.lon, label: hit.label, source: "auto" };
  }
  // Photon is fuzzier and handles typos / translated names better.
  const ph = pick(await geocode(variants[0] ?? name, { cc: country, provider: "photon" }));
  if (ph) return { lat: ph.lat, lon: ph.lon, label: ph.label, source: "auto" };

  // Fallback: city encoded in the Erasmus code (approximate location).
  const city = cityFromErasmusCode(code);
  if (city.length >= 3) {
    const hit = (await geocode(city, { cc: country, provider: "photon", places: true }))[0];
    if (hit) return { lat: hit.lat, lon: hit.lon, label: `≈ ${hit.label}`, source: "approx" };
  }
  return null;
}
