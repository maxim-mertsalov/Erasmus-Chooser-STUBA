"use client";
import staticCacheData from "@/lib/data/staticGeocache.json";
import { toIso2 } from "@/lib/countries";
import { autoLocate as rawAutoLocate, geocode, scoreGeoHit, type GeoHit, type LocateResult } from "@/lib/geocode";

interface StaticEntry {
  lat: number;
  lon: number;
  label: string;
  score?: number;
}

const staticCache: Record<string, StaticEntry> = staticCacheData as Record<string, StaticEntry>;

function getStaticMatch(name: string, country: string): LocateResult | null {
  const normName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const rawCountry = (country || "").toLowerCase().trim();
  const normCountry = toIso2(rawCountry).toLowerCase();

  const key = `${normName}|${normCountry}`;
  const hit = staticCache[key] ?? (rawCountry !== normCountry ? staticCache[`${normName}|${rawCountry}`] : undefined);
  if (hit) {
    return {
      lat: hit.lat,
      lon: hit.lon,
      label: hit.label,
      source: "exact",
      score: hit.score ?? 100,
    };
  }

  // Check prefix or partial in static cache
  for (const [k, val] of Object.entries(staticCache)) {
    const [cName, cCountry] = k.split("|");
    if ((cCountry === normCountry || cCountry === rawCountry) && (normName.includes(cName) || cName.includes(normName))) {
      return {
        lat: val.lat,
        lon: val.lon,
        label: val.label,
        source: "exact",
        score: val.score ?? 98,
      };
    }
  }

  return null;
}

export async function locateUniversity(
  name: string,
  country: string,
  code: string,
): Promise<LocateResult | null> {
  // 1. Static bundled cache (instant, zero network)
  const staticHit = getStaticMatch(name, country);
  if (staticHit) return staticHit;

  // 2. Dynamic geocoder with similarity scoring and Edge CDN cache
  return rawAutoLocate(name, country, code);
}

export { geocode, scoreGeoHit };
export type { GeoHit, LocateResult };
