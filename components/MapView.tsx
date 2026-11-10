"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Languages, MessageSquareText } from "lucide-react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeDark(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getIsDark = () => window.matchMedia(DARK_QUERY).matches;
const getIsDarkServer = () => false;
import type { CircleMarker as LCircleMarker } from "leaflet";
import { flag } from "@/lib/countries";
import type { Agreement, UniData } from "@/lib/types";

export interface MapPoint {
  uniKey: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  approx: boolean;
  locStatus: "exact" | "auto" | "unresolved" | "manual";
  priority: number;
  data: UniData;
  agreements: Agreement[];
  noteCount: number;
}

const COLORS = ["#64748b", "#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444"];

/** Spread approximate (city-level) markers a bit so they don't overlap perfectly. */
function jitter(key: string, approx: boolean): [number, number] {
  if (!approx) return [0, 0];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return [((h & 0xff) / 255 - 0.5) * 0.04, (((h >> 8) & 0xff) / 255 - 0.5) * 0.06];
}

function Controller({
  points,
  selected,
  flyKey,
  markers,
  pickMode,
  onPick,
}: {
  points: MapPoint[];
  selected: string | null;
  flyKey: number;
  markers: React.RefObject<Map<string, LCircleMarker>>;
  pickMode: boolean;
  onPick: (lat: number, lon: number) => void;
}) {
  const map = useMap();
  const fitted = useRef(false);

  // Keep the map sized correctly when panes are toggled/resized.
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);

  // Fit to all points once they first appear.
  useEffect(() => {
    if (fitted.current || !points.length) return;
    fitted.current = true;
    map.fitBounds(
      points.map((p) => [p.lat, p.lon] as [number, number]),
      { padding: [30, 30], maxZoom: 6 },
    );
  }, [points, map]);

  // Fly to selection requested from the table.
  useEffect(() => {
    if (!selected || !flyKey) return;
    const p = points.find((x) => x.uniKey === selected);
    if (!p) return;
    const [dy, dx] = jitter(p.uniKey, p.approx);
    map.flyTo([p.lat + dy, p.lon + dx], Math.max(map.getZoom(), 7), { duration: 0.6 });
    const t = setTimeout(() => markers.current?.get(selected)?.openPopup(), 650);
    return () => clearTimeout(t);
  }, [flyKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvents({
    click(e) {
      if (pickMode) onPick(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode, map]);

  return null;
}

export default function MapView(props: {
  points: MapPoint[];
  selected: string | null;
  flyKey: number;
  pickLabel: string | null;
  onSelectUni: (uniKey: string) => void;
  onSelectRow: (uniKey: string, rowId: string) => void;
  onOpenDetails: (uniKey: string) => void;
  onPick: (lat: number, lon: number) => void;
  onCancelPick: () => void;
  missingCount: number;
  geoStatus: React.ReactNode;
}) {
  const markers = useRef(new Map<string, LCircleMarker>());
  const isDark = useSyncExternalStore(subscribeDark, getIsDark, getIsDarkServer);
  const { points, selected } = props;
  // Higher priority markers are drawn on top.
  const ordered = useMemo(() => [...points].sort((a, b) => a.priority - b.priority), [points]);
  useEffect(() => {
    if (selected) markers.current.get(selected)?.bringToFront();
  }, [selected, ordered]);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={[50, 15]} zoom={4} className="h-full w-full" worldCopyJump>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Controller
          points={points}
          selected={selected}
          flyKey={props.flyKey}
          markers={markers}
          pickMode={Boolean(props.pickLabel)}
          onPick={props.onPick}
        />
        {ordered.map((p) => {
          const isSel = p.uniKey === selected;
          const [dy, dx] = jitter(p.uniKey, p.approx);
          return (
            <CircleMarker
              key={p.uniKey}
              ref={(m) => {
                if (m) markers.current.set(p.uniKey, m);
                else markers.current.delete(p.uniKey);
              }}
              center={[p.lat + dy, p.lon + dx]}
              radius={isSel ? 11 : 7}
              pathOptions={{
                color: isSel ? (isDark ? "#ffffff" : "#1e1b4b") : isDark ? "#0f172a" : "#ffffff",
                weight: isSel ? 3 : 1.5,
                fillColor: COLORS[Math.min(p.priority, 5)],
                fillOpacity: isDark ? 0.95 : 0.9,
                dashArray: p.approx ? "3 3" : undefined,
              }}
              eventHandlers={{ click: () => !props.pickLabel && props.onSelectUni(p.uniKey) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                {flag(p.country)} {p.name}
              </Tooltip>
              <Popup minWidth={240} maxWidth={320}>
                <div className="text-sm">
                  <div className="font-semibold">
                    {flag(p.country)} {p.name}
                  </div>
                  {p.data.city && <div className="text-slate-500 dark:text-slate-400">{p.data.city}</div>}
                  {p.locStatus === "unresolved" && (
                    <div className="my-0.5 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                      Unresolved — verify location
                    </div>
                  )}
                  {p.locStatus === "auto" && (
                    <div className="my-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                      Resolved automatically
                    </div>
                  )}
                  {p.data.language && (
                    <div className="inline-flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                      <span>{p.data.language}</span>
                    </div>
                  )}
                  {p.noteCount > 0 && (
                    <div className="inline-flex items-center gap-1.5">
                      <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                      <span>{p.noteCount} note(s)</span>
                    </div>
                  )}
                  <div className="mt-1 max-h-40 overflow-auto">
                    {p.agreements.map((a) => (
                      <button
                        key={a.id}
                        className="block w-full rounded px-1 text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                        onClick={() => props.onSelectRow(p.uniKey, a.id)}
                      >
                        <b>{a.faculty}</b> · {a.program} {a.validTo && <span className="text-slate-400">until {a.validTo}</span>}
                      </button>
                    ))}
                  </div>
                  <button className="mt-2 text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => props.onOpenDetails(p.uniKey)}>
                    Open details →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {props.pickLabel && (
        <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white shadow-lg">
          Click on the map to place <b>{props.pickLabel}</b>
          <button className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30" onClick={props.onCancelPick}>
            Cancel
          </button>
        </div>
      )}

      <div className="absolute bottom-6 left-2 z-[1000] flex flex-col gap-1 rounded-lg bg-white/90 px-3 py-2 text-xs shadow dark:border dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400">Priority:</span>
          {COLORS.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-0.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              {i}
            </span>
          ))}
        </div>
        {props.missingCount > 0 && <div className="text-amber-700 dark:text-amber-400">{props.missingCount} universities without location</div>}
        {props.geoStatus}
      </div>
    </div>
  );
}
