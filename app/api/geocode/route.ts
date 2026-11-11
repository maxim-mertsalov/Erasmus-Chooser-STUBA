// Free geocoding proxy.
//  - provider=nominatim  -> OpenStreetMap Nominatim (max 1 request/second, requires a User-Agent)
//  - provider=photon     -> Komoot Photon (OSM based, fuzzy/prefix search, fair use)
// The proxy adds the required identification header, serialises requests to respect the
// rate limits, and caches results in memory.
import type { NextRequest } from "next/server";

export interface GeoResult {
  lat: number;
  lon: number;
  label: string;
  kind: string;
  countryCode: string;
}

const USER_AGENT = `ErasmusChooser/1.0 (${process.env.GEOCODER_CONTACT || "self-hosted study helper"})`;
const cache = new Map<string, GeoResult[]>();
const queues: Record<string, Promise<unknown>> = {};
const lastCall: Record<string, number> = {};
const GAP: Record<string, number> = { nominatim: 1100, photon: 350 };

/** Run fn after the previous call of the same provider, keeping a minimal gap between calls. */
function schedule<T>(provider: string, fn: () => Promise<T>): Promise<T> {
  const prev = queues[provider] ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(async () => {
      const wait = (lastCall[provider] ?? 0) + GAP[provider] - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCall[provider] = Date.now();
      return fn();
    });
  queues[provider] = next;
  return next;
}

async function nominatim(q: string, cc: string): Promise<GeoResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");
  if (cc) url.searchParams.set("countrycodes", cc.toLowerCase());
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Referer: "https://erasmus-chooser.local" } });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const arr = (await res.json()) as Array<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return arr.map((r) => ({
    lat: Number(r.lat),
    lon: Number(r.lon),
    label: String(r.display_name ?? ""),
    kind: `${r.category ?? ""}:${r.type ?? ""}`,
    countryCode: String(r.address?.country_code ?? "").toUpperCase(),
  }));
}

async function photon(q: string, cc: string, placesOnly: boolean): Promise<GeoResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "10");
  url.searchParams.set("lang", "en");
  if (placesOnly) url.searchParams.set("osm_tag", "place");
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const j = (await res.json()) as { features: Array<Record<string, any>> }; // eslint-disable-line @typescript-eslint/no-explicit-any
  return j.features
    .map((f) => {
      const p = f.properties ?? {};
      return {
        lat: Number(f.geometry.coordinates[1]),
        lon: Number(f.geometry.coordinates[0]),
        label: [p.name, p.city, p.state, p.country].filter(Boolean).join(", "),
        kind: `${p.osm_key ?? ""}:${p.osm_value ?? ""}`,
        countryCode: String(p.countrycode ?? "").toUpperCase(),
      };
    })
    .filter((r) => !cc || r.countryCode === cc.toUpperCase())
    .slice(0, 5);
}

const HIT_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800",
};
const EMPTY_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, s-maxage=86400",
};

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  const cc = (sp.get("cc") ?? "").trim().toUpperCase().slice(0, 2);
  const provider = sp.get("provider") === "photon" ? "photon" : "nominatim";
  const places = sp.get("places") === "1";
  if (!q) return Response.json({ results: [] }, { headers: EMPTY_CACHE_HEADERS });

  const cacheKey = `${provider}|${cc}|${places}|${q.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit) {
    return Response.json({ results: hit, cached: true }, { headers: hit.length ? HIT_CACHE_HEADERS : EMPTY_CACHE_HEADERS });
  }

  try {
    const results = await schedule(provider, () => (provider === "photon" ? photon(q, cc, places) : nominatim(q, cc)));
    if (cache.size > 5000) cache.clear();
    cache.set(cacheKey, results);
    return Response.json({ results }, { headers: results.length ? HIT_CACHE_HEADERS : EMPTY_CACHE_HEADERS });
  } catch (e) {
    return Response.json(
      { results: [], error: (e as Error).message },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
