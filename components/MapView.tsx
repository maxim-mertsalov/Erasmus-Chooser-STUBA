"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ExternalLink, Languages, MessageSquareText } from "lucide-react";
import L, { type CircleMarker as LCircleMarker } from "leaflet";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { flag } from "@/lib/countries";
import type { Agreement, UniData } from "@/lib/types";

const DARK_QUERY = "(prefers-color-scheme: dark)";
function subscribeDark(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getIsDark = () => window.matchMedia(DARK_QUERY).matches;
const getIsDarkServer = () => false;

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

/** Spread approximate (city-level) markers a bit so they don't overlap perfectly (~300m max). */
function jitter(key: string, approx: boolean): [number, number] {
  if (!approx) return [0, 0];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return [((h & 0xff) / 255 - 0.5) * 0.003, (((h >> 8) & 0xff) / 255 - 0.5) * 0.004];
}

interface ClusterItem {
  id: string;
  lat: number;
  lon: number;
  points: MapPoint[];
  maxPriority: number;
  hasSelected: boolean;
}

function computeClusters(
  points: MapPoint[],
  map: L.Map,
  selectedUni: string | null,
  clusterEnabled = true,
): ClusterItem[] {
  if (!points.length) return [];
  if (!clusterEnabled) {
    return points.map((p) => {
      const isSel = p.uniKey === selectedUni;
      const [dy, dx] = jitter(p.uniKey, p.approx);
      return {
        id: `single-${p.uniKey}`,
        lat: p.lat + dy,
        lon: p.lon + dx,
        points: [p],
        maxPriority: p.priority,
        hasSelected: isSel,
      };
    });
  }

  const zoom = map.getZoom();

  // Tight clustering radius: only group truly overlapping pins in same city/campus
  const radius = zoom >= 11 ? 14 : zoom >= 8 ? 20 : 28;
  const clusters: ClusterItem[] = [];

  for (const p of points) {
    const isSel = p.uniKey === selectedUni;
    const [dy, dx] = jitter(p.uniKey, p.approx);
    const lat = p.lat + dy;
    const lon = p.lon + dx;
    const pt = map.latLngToLayerPoint([lat, lon]);

    let matched: ClusterItem | null = null;
    for (const c of clusters) {
      const cPt = map.latLngToLayerPoint([c.lat, c.lon]);
      const dist = Math.hypot(pt.x - cPt.x, pt.y - cPt.y);
      if (dist < radius) {
        matched = c;
        break;
      }
    }

    if (matched) {
      matched.points.push(p);
      matched.maxPriority = Math.max(matched.maxPriority, p.priority);
      if (isSel) matched.hasSelected = true;
    } else {
      clusters.push({
        id: `c-${p.uniKey}`,
        lat,
        lon,
        points: [p],
        maxPriority: p.priority,
        hasSelected: isSel,
      });
    }
  }

  return clusters;
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
    // Comfortable zoom between 7 and 8 (doesn't jump wildly into street level)
    const targetZoom = Math.min(Math.max(map.getZoom(), 7), 8);
    map.flyTo([p.lat + dy, p.lon + dx], targetZoom, { duration: 0.5 });
    const t = setTimeout(() => markers.current?.get(selected)?.openPopup(), 550);
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

function ClusteredMarkersLayer({
  points,
  selected,
  isDark,
  markers,
  pickMode,
  clusterMarkers = true,
  onSelectUni,
  onSelectRow,
  onOpenDetails,
}: {
  points: MapPoint[];
  selected: string | null;
  isDark: boolean;
  markers: React.RefObject<Map<string, LCircleMarker>>;
  pickMode: boolean;
  clusterMarkers?: boolean;
  onSelectUni: (uniKey: string) => void;
  onSelectRow: (uniKey: string, rowId: string) => void;
  onOpenDetails: (uniKey: string) => void;
}) {
  const map = useMap();
  const [mapVersion, setMapVersion] = useState(0);

  useMapEvents({
    zoomend() {
      setMapVersion((v) => v + 1);
    },
    moveend() {
      setMapVersion((v) => v + 1);
    },
  });

  const clusters = useMemo(() => {
    void mapVersion;
    return computeClusters(points, map, selected, clusterMarkers);
  }, [points, map, selected, mapVersion, clusterMarkers]);

  return (
    <>
      {clusters.map((cluster) => {
        if (cluster.points.length === 1) {
          const p = cluster.points[0];
          const isSel = p.uniKey === selected;
          return (
            <CircleMarker
              key={p.uniKey}
              ref={(m) => {
                if (m) markers.current?.set(p.uniKey, m);
                else markers.current?.delete(p.uniKey);
              }}
              center={[cluster.lat, cluster.lon]}
              radius={isSel ? 11 : 7}
              pathOptions={{
                color: isSel ? (isDark ? "#ffffff" : "#1e1b4b") : isDark ? "#0f172a" : "#ffffff",
                weight: isSel ? 3 : 1.5,
                fillColor: COLORS[Math.min(p.priority, 5)],
                fillOpacity: isDark ? 0.95 : 0.9,
                dashArray: p.approx ? "3 3" : undefined,
              }}
              eventHandlers={{ click: () => !pickMode && onSelectUni(p.uniKey) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="font-semibold">{flag(p.country)} {p.name}</span>
                <span className="text-slate-400 text-xs ml-1">({p.agreements.length} agreements)</span>
              </Tooltip>
              <Popup minWidth={240} maxWidth={320}>
                <div className="text-sm">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
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
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <Languages className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                      <span>{p.data.language}</span>
                    </div>
                  )}
                  {p.noteCount > 0 && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                      <span>{p.noteCount} note(s)</span>
                    </div>
                  )}
                  <div className="mt-1.5 max-h-40 overflow-auto border-t border-slate-100 pt-1 dark:border-slate-800">
                    {p.agreements.map((a) => (
                      <button
                        key={a.id}
                        className="block w-full rounded px-1 py-0.5 text-left text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                        onClick={() => onSelectRow(p.uniKey, a.id)}
                      >
                        <b>{a.faculty}</b> · {a.program} {a.validTo && <span className="text-slate-400">until {a.validTo}</span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1.5 dark:border-slate-800">
                    <button className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => onOpenDetails(p.uniKey)}>
                      Open details →
                    </button>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 hover:underline dark:text-slate-400"
                      title="Open in Google Maps"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        }

        // Multi-point cluster marker
        const count = cluster.points.length;
        const size = count < 5 ? 30 : count < 15 ? 36 : 42;
        const fontSize = count < 5 ? 12 : count < 15 ? 13 : 14;
        const color = COLORS[Math.min(cluster.maxPriority, 5)];
        const ringColor = cluster.hasSelected ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
        const ringWidth = cluster.hasSelected ? 4 : 2;

        const icon = L.divIcon({
          className: "custom-cluster-icon",
          html: `
            <div style="
              background: ${color};
              color: #ffffff;
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 9999px;
              font-weight: 700;
              font-size: ${fontSize}px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 0 0 ${ringWidth}px ${ringColor};
              cursor: pointer;
              user-select: none;
            ">
              ${count}
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        return (
          <Marker
            key={cluster.id}
            position={[cluster.lat, cluster.lon]}
            icon={icon}
            eventHandlers={{
              click: () => {
                if (pickMode) return;
                const latLngs = cluster.points.map((pt) => [pt.lat, pt.lon] as [number, number]);
                const bounds = L.latLngBounds(latLngs);
                if (map.getZoom() >= 14) {
                  map.flyTo([cluster.lat, cluster.lon], map.getZoom() + 1);
                } else {
                  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                }
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -Math.floor(size / 2) - 4]}
              opacity={0.98}
            >
              <div className="p-1 min-w-48 max-w-72 text-slate-900 dark:text-slate-100">
                <div className="font-semibold border-b border-slate-200 dark:border-slate-700 pb-1 mb-1.5 flex items-center justify-between text-xs">
                  <span>📍 {count} Universities</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-normal">Click to zoom</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 text-xs">
                  {cluster.points.slice(0, 8).map((u) => (
                    <div key={u.uniKey} className="flex items-center gap-1.5">
                      <span>{flag(u.country)}</span>
                      <span className="truncate flex-1 font-medium">{u.name}</span>
                      <span className="text-slate-400 text-[11px] shrink-0">({u.agreements.length})</span>
                    </div>
                  ))}
                  {cluster.points.length > 8 && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                      +{cluster.points.length - 8} more universities…
                    </div>
                  )}
                </div>
              </div>
            </Tooltip>

            {map.getZoom() >= 14 && (
              <Popup minWidth={240} maxWidth={320}>
                <div className="text-sm">
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1 border-b border-slate-200 dark:border-slate-700 pb-1 text-xs">
                    {count} Universities at this location
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {cluster.points.map((u) => (
                      <div key={u.uniKey} className="border-b border-slate-100 pb-1.5 dark:border-slate-800 last:border-0">
                        <div className="font-medium text-xs">
                          {flag(u.country)} {u.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {u.agreements.length} agreement(s)
                        </div>
                        <button
                          className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 mt-0.5"
                          onClick={() => onOpenDetails(u.uniKey)}
                        >
                          Open details →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            )}
          </Marker>
        );
      })}
    </>
  );
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
  clusterMarkers?: boolean;
}) {
  const [instanceId] = useState(() => `leaflet-${Math.random().toString(36).slice(2, 9)}`);
  const markers = useRef(new Map<string, LCircleMarker>());
  const isDark = useSyncExternalStore(subscribeDark, getIsDark, getIsDarkServer);
  const { points, selected, clusterMarkers } = props;

  useEffect(() => {
    const currentMarkers = markers.current;
    return () => {
      currentMarkers.clear();
    };
  }, []);

  return (
    <div className="relative h-full w-full">
      <MapContainer key={instanceId} center={[50, 15]} zoom={4} className="h-full w-full" worldCopyJump>
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
        <ClusteredMarkersLayer
          points={points}
          selected={selected}
          isDark={isDark}
          markers={markers}
          pickMode={Boolean(props.pickLabel)}
          clusterMarkers={clusterMarkers ?? true}
          onSelectUni={props.onSelectUni}
          onSelectRow={props.onSelectRow}
          onOpenDetails={props.onOpenDetails}
        />
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
