"use client";
import React, { useState } from "react";
import { ExternalLink, MapPin, Pencil, RefreshCw } from "lucide-react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore } from "@/lib/store";
import type { UniData } from "@/lib/types";
import { locateUniversity, geocode, type GeoHit } from "@/lib/services/geocodingService";
import { b, inputCls, Spinner } from "../ui";
import { Section } from "./DetailSection";

export function DetailLocationSection({
  uni,
  data,
  store,
  onStartPick,
  readOnly = false,
  collapsed,
  onToggle,
  borderTop = true,
}: {
  uni: UniGroup;
  data: UniData;
  store: RecordStore;
  onStartPick: () => void;
  readOnly?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
}) {
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoHits, setGeoHits] = useState<GeoHit[] | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [coords, setCoords] = useState("");

  const runAuto = async () => {
    setGeoBusy(true);
    setGeoMsg("");
    try {
      const r = await locateUniversity(uni.name, uni.country, uni.code);
      if (r) {
        store.setUni(uni.uniKey, { lat: r.lat, lon: r.lon, geoSource: r.source, geoScore: r.score, geoLabel: r.label });
        setIsEditingLocation(false);
      } else {
        store.setUni(uni.uniKey, { geoSource: "failed", geoScore: undefined });
        setGeoMsg("Nothing found. Try searching or pick on the map.");
      }
    } catch (e) {
      setGeoMsg((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  };

  const runSearch = async () => {
    if (!geoQuery.trim()) return;
    setGeoBusy(true);
    try {
      const [n, p] = await Promise.all([
        geocode(geoQuery, {}),
        geocode(geoQuery, { provider: "photon" }),
      ]);
      setGeoHits([...n, ...p].slice(0, 8));
    } catch (e) {
      setGeoMsg((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  };

  const applyCoords = () => {
    const m = coords.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return setGeoMsg("Use format: 48.1486, 17.1077");
    store.setUni(uni.uniKey, { lat: +m[1], lon: +m[2], geoSource: "manual", geoLabel: "Manual coordinates" });
    setCoords("");
    setIsEditingLocation(false);
  };

  return (
    <Section
      title="Location"
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
      right={
        data.lat != null && collapsed && (
          <a
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            target="_blank"
            rel="noreferrer"
            href={`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`}
            title="Open location in Google Maps"
          >
            <span>Google Maps</span>
            <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
          </a>
        )
      }
    >
      {!isEditingLocation ? (
        /* Compact default view */
        <div className="flex flex-col gap-2">
          {data.lat != null ? (
            <>
              <div className="flex items-start gap-2">
                <span
                  className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${
                    data.geoSource === "exact"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                      : data.geoSource === "auto"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                        : data.geoSource === "manual"
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-950/70 dark:text-violet-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300"
                  }`}
                >
                  {data.geoSource === "exact"
                    ? "Exact match"
                    : data.geoSource === "auto"
                      ? `Auto (${data.geoScore ?? 90}%)`
                      : data.geoSource === "manual"
                        ? "Manual"
                        : "Unresolved"}
                </span>
                <div className="min-w-0 flex-1 text-xs text-slate-700 dark:text-slate-300">
                  {data.geoLabel || `${data.lat.toFixed(4)}, ${data.lon?.toFixed(4)}`}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-indigo-400 dark:hover:bg-slate-700/60"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${data.lat},${data.lon}`}
                  title="Open in Google Maps"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                  <span>Google Maps</span>
                </a>

                {!readOnly && (
                  <button
                    type="button"
                    className={b("secondary", "text-xs py-1")}
                    onClick={() => setIsEditingLocation(true)}
                  >
                    <Pencil className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                    <span>Edit location</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-xs text-amber-700 dark:text-amber-400">
                {data.geoSource === "failed" ? "Not found automatically" : "Not located yet"}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  className={b("secondary", "text-xs py-1")}
                  onClick={() => {
                    setIsEditingLocation(true);
                    runAuto();
                  }}
                >
                  <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
                  <span>Locate</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Expanded editing controls */
        <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Location Settings</span>
            <button
              type="button"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              onClick={() => setIsEditingLocation(false)}
            >
              Done
            </button>
          </div>

          {!readOnly && (
            <>
              <div className="flex flex-wrap gap-2">
                <button className={b("secondary", "text-xs")} disabled={geoBusy} onClick={runAuto}>
                  {geoBusy ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
                  <span>Auto-locate</span>
                </button>
                <button className={b("secondary", "text-xs")} onClick={onStartPick}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  <span>Pick on map</span>
                </button>
                {data.lat != null && (
                  <button
                    className={b("danger", "text-xs")}
                    onClick={() => store.setUni(uni.uniKey, { lat: undefined, lon: undefined, geoSource: "failed", geoLabel: "" })}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Search place (address, city)…"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
                <button className={b("secondary", "text-xs")} onClick={runSearch} disabled={geoBusy}>
                  Search
                </button>
              </div>

              {geoHits && (
                <div className="max-h-48 overflow-auto rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {geoHits.length === 0 && <div className="p-2 text-xs text-slate-500">No results found</div>}
                  {geoHits.map((h, i) => (
                    <button
                      key={i}
                      className="block w-full border-b border-slate-100 px-2 py-1 text-left text-xs hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-indigo-950/60"
                      onClick={() => {
                        store.setUni(uni.uniKey, { lat: h.lat, lon: h.lon, geoSource: "manual", geoScore: 100, geoLabel: h.label });
                        setGeoHits(null);
                        setIsEditingLocation(false);
                      }}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Coordinates: 48.1486, 17.1077"
                  value={coords}
                  onChange={(e) => setCoords(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyCoords()}
                />
                <button className={b("secondary", "text-xs")} onClick={applyCoords} disabled={!coords.trim()}>
                  Set
                </button>
              </div>

              {geoMsg && <div className="text-xs text-amber-700 dark:text-amber-400">{geoMsg}</div>}
            </>
          )}
        </div>
      )}
    </Section>
  );
}
