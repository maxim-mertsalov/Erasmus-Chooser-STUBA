"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Filter,
  GraduationCap,
  HardDrive,
  HelpCircle,
  Link2,
  Map as MapIcon,
  MapPin,
  MessageSquareText,
  MoreHorizontal,
  MousePointerClick,
  Pause,
  Pencil,
  Play,
  Share2,
  SlidersHorizontal,
  Table2,
  Upload,
  X,
} from "lucide-react";
import { countryName, flag } from "@/lib/countries";
import { autoLocate } from "@/lib/geocode";
import type { RecordStore, StoreState } from "@/lib/store";
import { defaultFilters, type Source } from "@/lib/session";
import { NOTE_CATEGORIES, STATUSES, type Agreement, type Filters, type RowStatus } from "@/lib/types";
import { DetailPanel, type UniGroup } from "./DetailPanel";
import type { MapPoint } from "./MapView";
import { b, GITHUB_URL, GitHubIcon, inputCls, MultiSelect, Spinner, Stars } from "./ui";

const MOBILE_QUERY = "(max-width: 767px)";
function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getIsMobile = () => window.matchMedia(MOBILE_QUERY).matches;
const getIsMobileServer = () => false;

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading map…</div>,
});

export const orEmpty = (v: string) => v || "(empty)";

type SortKey = "priority" | "uniName" | "country" | "faculty" | "program" | "validTo" | "language" | "status" | "notes" | "location";

const COLUMNS: { key: SortKey; label: React.ReactNode; cls?: string }[] = [
  { key: "priority", label: "Priority", cls: "w-24" },
  { key: "uniName", label: "University" },
  { key: "country", label: "Country", cls: "w-20" },
  { key: "faculty", label: "Faculty", cls: "w-20" },
  { key: "program", label: "Program", cls: "w-28" },
  { key: "validTo", label: "Valid until", cls: "w-24" },
  { key: "language", label: "Language", cls: "w-28" },
  { key: "status", label: "Status", cls: "w-28" },
  { key: "notes", label: "Notes / links", cls: "w-28" },
  { key: "location", label: <MapPin className="mx-auto h-3.5 w-3.5" strokeWidth={1.75} />, cls: "w-10" },
];

function locState(state: StoreState, uniKey: string): "ok" | "approx" | "missing" {
  const d = state.uni.get(uniKey);
  if (d?.lat == null) return "missing";
  return d.geoSource === "approx" ? "approx" : "ok";
}

export function MainView(props: {
  agreements: Agreement[];
  store: RecordStore;
  source: Source;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onEditSetup: () => void;
  onClose: () => void;
  onMakeCopy: () => void;
  onReconnect: () => void;
}) {
  const { store, filters, setFilters } = props;
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);
  const [desktopTable, setDesktopTable] = useState(true);
  const [desktopMap, setDesktopMap] = useState(true);
  const [mobileTab, setMobileTab] = useState<"table" | "map">("table");
  const showTable = isMobile ? mobileTab === "table" : desktopTable;
  const showMap = isMobile ? mobileTab === "map" : desktopMap;
  const [showFilters, setShowFilters] = useState(false);
  const [openOnClick, setOpenOnClick] = useState(true);
  const [splitPct, setSplitPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const [selectedUni, setSelectedUni] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [detailUni, setDetailUni] = useState<string | null>(null);
  const [pickUni, setPickUni] = useState<string | null>(null);
  const [flyKey, setFlyKey] = useState(0);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "priority", dir: -1 });
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geo, setGeo] = useState({ done: 0, total: 0, current: "", error: "" });
  const tableRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) menuRef.current.open = false;
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect || !rect.width) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  // 1) Base set = setup filters (faculties / programs / active).
  const base = useMemo(
    () =>
      props.agreements.filter(
        (a) =>
          (!filters.faculties.length || filters.faculties.includes(orEmpty(a.faculty))) &&
          (!filters.programs.length || filters.programs.includes(orEmpty(a.program))) &&
          (!filters.onlyActive || a.active),
      ),
    [props.agreements, filters.faculties, filters.programs, filters.onlyActive],
  );

  // University groups (over the base set) – used for details, geocoding.
  const groups = useMemo(() => {
    const m = new Map<string, UniGroup>();
    for (const a of base) {
      let g = m.get(a.uniKey);
      if (!g) m.set(a.uniKey, (g = { uniKey: a.uniKey, name: a.uniName, country: a.country, code: a.uniCode, agreements: [] }));
      g.agreements.push(a);
      if (a.uniName && a.uniName.length < g.name.length) g.name = a.uniName; // shortest name is usually the cleanest
    }
    return m;
  }, [base]);

  // 2) Table filters (incl. custom fields).
  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const lang = filters.language.trim().toLowerCase();
    const tag = filters.tag.trim().toLowerCase();
    return base.filter((a) => {
      const rd = state.row.get(a.id) ?? {};
      const ud = state.uni.get(a.uniKey) ?? {};
      if (!filters.showHidden && rd.hidden) return false;
      if (filters.countries.length && !filters.countries.includes(a.country)) return false;
      if (filters.statuses.length && !filters.statuses.includes(rd.status || "none")) return false;
      if (filters.minPriority && (rd.priority ?? 0) < filters.minPriority) return false;
      if (filters.hideExpired && a.validToTs != null && a.validToTs < now) return false;
      if (lang && !(ud.language ?? "").toLowerCase().includes(lang)) return false;
      if (tag && !(ud.tags ?? "").toLowerCase().includes(tag)) return false;
      if (filters.noteCategory) {
        const notes = state.notes.get(a.uniKey) ?? [];
        if (filters.noteCategory === "__any" ? !notes.length : !notes.some((n) => n.category === filters.noteCategory)) return false;
      }
      if (filters.location && locState(state, a.uniKey) !== filters.location) return false;
      if (q) {
        const hay = `${a.uniName} ${a.uniCode} ${a.country} ${countryName(a.country)} ${ud.city ?? ""} ${ud.language ?? ""} ${ud.tags ?? ""}`.toLowerCase();
        if (!hay.includes(q) && !(state.notes.get(a.uniKey) ?? []).some((n) => n.text.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [base, filters, state, now]);

  const sorted = useMemo(() => {
    const val = (a: Agreement): string | number => {
      const rd = state.row.get(a.id) ?? {};
      const ud = state.uni.get(a.uniKey) ?? {};
      switch (sort.key) {
        case "priority":
          return rd.priority ?? 0;
        case "validTo":
          return a.validToTs ?? 0;
        case "language":
          return ud.language ?? "";
        case "status":
          return STATUSES.findIndex((s) => s.value === (rd.status ?? ""));
        case "notes":
          return (state.notes.get(a.uniKey)?.length ?? 0) + (state.links.get(a.uniKey)?.length ?? 0);
        case "location":
          return ["missing", "approx", "ok"].indexOf(locState(state, a.uniKey));
        default:
          return a[sort.key];
      }
    };
    return [...visible].sort((x, y) => {
      const a = val(x);
      const c = val(y);
      const r = typeof a === "number" && typeof c === "number" ? a - c : String(a).localeCompare(String(c));
      return r * sort.dir || x.uniName.localeCompare(y.uniName);
    });
  }, [visible, sort, state]);

  // Map points: universities that have at least one visible row and a location.
  const { points, missing } = useMemo(() => {
    const byUni = new Map<string, Agreement[]>();
    visible.forEach((a) => (byUni.get(a.uniKey) ?? byUni.set(a.uniKey, []).get(a.uniKey)!).push(a));
    const pts: MapPoint[] = [];
    let miss = 0;
    byUni.forEach((rows, uniKey) => {
      const d = state.uni.get(uniKey);
      const g = groups.get(uniKey)!;
      if (d?.lat == null || d.lon == null) {
        miss++;
        return;
      }
      pts.push({
        uniKey,
        name: g.name,
        country: g.country,
        lat: d.lat,
        lon: d.lon,
        approx: d.geoSource === "approx",
        priority: Math.max(0, ...rows.map((r) => state.row.get(r.id)?.priority ?? 0)),
        data: d,
        agreements: rows,
        noteCount: state.notes.get(uniKey)?.length ?? 0,
      });
    });
    return { points: pts, missing: miss };
  }, [visible, state, groups]);

  // Background auto-geocoding of universities without a location (free OSM services, ~1 req/s).
  const groupKeys = useMemo(() => [...groups.keys()].join("|"), [groups]);
  useEffect(() => {
    if (!geoEnabled) return;
    let cancelled = false;
    const needs = (k: string) => {
      const d = store.getSnapshot().uni.get(k);
      return !d || (d.lat == null && !d.geoSource);
    };
    (async () => {
      const todo = [...groups.values()].filter((g) => needs(g.uniKey));
      let done = 0;
      for (const g of todo) {
        if (cancelled) return;
        if (!needs(g.uniKey)) {
          done++;
          continue;
        }
        setGeo({ done, total: todo.length, current: g.name, error: "" });
        try {
          const r = await autoLocate(g.name, g.country, g.code);
          if (cancelled) return;
          store.setUni(g.uniKey, r ? { lat: r.lat, lon: r.lon, geoSource: r.source, geoLabel: r.label } : { geoSource: "failed" });
        } catch (e) {
          if (!cancelled) setGeo((s) => ({ ...s, error: (e as Error).message, current: "" }));
          return;
        }
        done++;
      }
      if (!cancelled) setGeo({ done: todo.length, total: todo.length, current: "", error: "" });
    })();
    return () => {
      cancelled = true;
    };
  }, [geoEnabled, groupKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  // Selection handlers
  const selectFromTable = (a: Agreement) => {
    const alreadySelected = selectedRow === a.id;
    setSelectedUni(a.uniKey);
    setSelectedRow(a.id);
    setFlyKey((k) => k + 1);
    if (openOnClick || detailUni || alreadySelected) setDetailUni(a.uniKey);
  };
  const scrollToRow = (rowId: string) =>
    requestAnimationFrame(() =>
      tableRef.current?.querySelector(`[data-row="${CSS.escape(rowId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  const selectFromMap = (uniKey: string) => {
    setSelectedUni(uniKey);
    const first = sorted.find((a) => a.uniKey === uniKey);
    setSelectedRow(first?.id ?? null);
    if (first) scrollToRow(first.id);
    if (detailUni) setDetailUni(uniKey);
  };
  const selectRowFromMap = (uniKey: string, rowId: string) => {
    setSelectedUni(uniKey);
    setSelectedRow(rowId);
    scrollToRow(rowId);
  };

  const countries = useMemo(() => {
    const m = new Map<string, number>();
    base.forEach((a) => m.set(a.country, (m.get(a.country) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => countryName(a[0]).localeCompare(countryName(b[0])));
  }, [base]);
  const facOptions = useMemo(() => [...new Set(props.agreements.map((a) => orEmpty(a.faculty)))].sort(), [props.agreements]);
  const progOptions = useMemo(() => [...new Set(props.agreements.map((a) => orEmpty(a.program)))].sort(), [props.agreements]);
  const categories = useMemo(() => {
    const s = new Set(NOTE_CATEGORIES);
    state.notes.forEach((arr) => arr.forEach((n) => s.add(n.category)));
    return [...s];
  }, [state.notes]);

  const f = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });
  const activeFilterCount =
    Number(!!filters.search) +
    filters.countries.length +
    filters.statuses.length +
    Number(!!filters.minPriority) +
    Number(!!filters.language) +
    Number(!!filters.noteCategory) +
    Number(!!filters.tag) +
    Number(!!filters.location) +
    Number(filters.hideExpired) +
    Number(filters.showHidden);

  const detailGroup = detailUni ? groups.get(detailUni) : undefined;
  const pickGroup = pickUni ? groups.get(pickUni) : undefined;
  const ro = state.readOnly;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "erasmus-notes.json";
    a.click();
  };
  const importJson = async (file: File) => {
    try {
      store.importAll(JSON.parse(await file.text()));
    } catch (e) {
      alert(`Import failed: ${(e as Error).message}`);
    }
  };
  const shareLink = () => {
    if (props.source.kind !== "google") return;
    const url = `${location.origin}${location.pathname}?sheet=${props.source.spreadsheetId}`;
    void navigator.clipboard.writeText(url);
    alert(
      `Link copied:\n${url}\n\nYour friend also needs access to the file in Google Drive (Share → "Anyone with the link" → Editor or Viewer).`,
    );
  };

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-2.5 py-2 sm:px-3">
        <button className={b("ghost", "shrink-0 px-2 text-indigo-600")} onClick={props.onClose} title="Back to start">
          <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1 min-[580px]:flex-initial">
          <div className="truncate text-sm font-semibold">
            {props.source.kind === "google" ? props.source.title : props.source.fileName}
          </div>
          <div className="truncate text-xs text-slate-500">
            {sorted.length}/{base.length}{" "}
            <span className="hidden min-[580px]:inline">agreements · {groups.size} universities</span>
          </div>
        </div>
        <div className="hidden min-[880px]:block">
          <SyncBadge state={state} onRetry={() => store.retry()} onReconnect={props.onReconnect} />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {isMobile ? (
            <button
              type="button"
              onClick={() => setMobileTab((t) => (t === "table" ? "map" : "table"))}
              className="inline-flex h-[34px] overflow-hidden rounded-md border border-slate-300 text-sm font-medium"
              title="Switch between Table and Map"
            >
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 ${
                  mobileTab === "table" ? "bg-indigo-600 text-white" : "bg-white text-slate-700"
                }`}
              >
                <Table2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="hidden min-[580px]:inline">Table</span>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 border-l border-slate-300 px-2.5 ${
                  mobileTab === "map" ? "bg-indigo-600 text-white" : "bg-white text-slate-700"
                }`}
              >
                <MapIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="hidden min-[580px]:inline">Map</span>
              </span>
            </button>
          ) : (
            <div className="inline-flex h-[34px] overflow-hidden rounded-md border border-slate-300 text-sm font-medium">
              <button
                className={`inline-flex items-center gap-1.5 px-3 ${
                  desktopTable ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => (desktopTable && !desktopMap ? null : setDesktopTable(!desktopTable))}
              >
                <Table2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Table</span>
              </button>
              <button
                className={`inline-flex items-center gap-1.5 border-l border-slate-300 px-3 ${
                  desktopMap ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                onClick={() => (desktopMap && !desktopTable ? null : setDesktopMap(!desktopMap))}
              >
                <MapIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Map</span>
              </button>
            </div>
          )}
          <button
            className={b(
              "secondary",
              `h-[34px] px-2.5 min-[580px]:px-3 ${showFilters || activeFilterCount > 0 ? "border-indigo-400 bg-indigo-50 text-indigo-700" : ""}`,
            )}
            onClick={() => setShowFilters((v) => !v)}
            title="Show or hide search and detailed filters"
          >
            <Filter className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden min-[580px]:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="rounded bg-indigo-600 px-1.5 text-xs text-white">{activeFilterCount}</span>
            )}
            {showFilters ? (
              <ChevronUp className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            )}
          </button>
          <div className="hidden items-center gap-1.5 min-[1110px]:flex">
            <button className={b("secondary", "h-[34px]")} onClick={props.onEditSetup} title="Faculties & programs">
              <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Faculties & programs</span>
            </button>
          </div>
          {props.source.kind === "google" && (
            <div className="hidden items-center gap-1.5 min-[880px]:flex">
              <button className={b("secondary", "h-[34px]")} onClick={shareLink} title="Copy a link for friends">
                <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Share</span>
              </button>
            </div>
          )}
          <details ref={menuRef} className="relative">
            <summary className={b("secondary", "h-[34px] cursor-pointer list-none px-2.5")} title="More actions">
              <MoreHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            </summary>
            <div className="absolute right-0 z-[1100] mt-1 flex w-64 max-w-[calc(100vw-1rem)] flex-col rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg">
              <div className="px-2 py-1.5 min-[880px]:hidden">
                <SyncBadge state={state} onRetry={() => store.retry()} onReconnect={props.onReconnect} />
              </div>
              <div className="min-[1110px]:hidden">
                <button
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50"
                  onClick={() => {
                    if (menuRef.current) menuRef.current.open = false;
                    props.onEditSetup();
                  }}
                >
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                  <span>Faculties & programs</span>
                </button>
              </div>
              {props.source.kind === "google" && (
                <div className="min-[880px]:hidden">
                  <button
                    className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50"
                    onClick={() => {
                      if (menuRef.current) menuRef.current.open = false;
                      shareLink();
                    }}
                  >
                    <Share2 className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                    <span>Share link</span>
                  </button>
                </div>
              )}
              <div className="my-1 border-t border-slate-100 min-[1110px]:hidden" />
              <button
                type="button"
                role="switch"
                aria-checked={openOnClick}
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50"
                onClick={() => setOpenOnClick((v) => !v)}
              >
                <MousePointerClick className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                <span className="flex-1">Open details on click</span>
                <span
                  className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                    openOnClick ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full bg-white transition-transform ${
                      openOnClick ? "translate-x-3" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50"
                onClick={() => {
                  if (menuRef.current) menuRef.current.open = false;
                  exportJson();
                }}
              >
                <Download className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                <span>Export notes (JSON)</span>
              </button>
              {!ro && (
                <label className="flex w-full cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 hover:bg-slate-50">
                  <Upload className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                  <span>Import notes (JSON)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      if (menuRef.current) menuRef.current.open = false;
                      if (e.target.files?.[0]) void importJson(e.target.files[0]);
                    }}
                  />
                </label>
              )}
              <button
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left hover:bg-slate-50"
                onClick={() => {
                  if (menuRef.current) menuRef.current.open = false;
                  setGeoEnabled((v) => !v);
                }}
              >
                {geoEnabled ? (
                  <Pause className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                ) : (
                  <Play className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                )}
                <span>{geoEnabled ? "Pause auto-locating" : "Resume auto-locating"}</span>
              </button>
              {props.source.kind === "google" && (
                <a
                  className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 hover:bg-slate-50"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://docs.google.com/spreadsheets/d/${props.source.spreadsheetId}/edit`}
                  onClick={() => {
                    if (menuRef.current) menuRef.current.open = false;
                  }}
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                  <span>Open in Google Sheets</span>
                </a>
              )}
              <a
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 hover:bg-slate-50"
                target="_blank"
                rel="noreferrer"
                href={GITHUB_URL}
                onClick={() => {
                  if (menuRef.current) menuRef.current.open = false;
                }}
              >
                <GitHubIcon className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Open on GitHub</span>
              </a>
              <div className="my-1 border-t border-slate-100" />
              <button
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-1.5 text-left text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  if (menuRef.current) menuRef.current.open = false;
                  props.onClose();
                }}
              >
                <X className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>Close file</span>
              </button>
            </div>
          </details>
        </div>
      </header>

      {ro && (
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
          <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>View-only access: your changes are not saved.</span>
          <button className={b("secondary", "py-0.5 text-xs")} onClick={props.onMakeCopy}>
            Make an editable copy
          </button>
        </div>
      )}

      {/* Filter bar */}
      {showFilters && (
        <div className="flex max-h-[45vh] flex-wrap items-center gap-1.5 overflow-y-auto border-b border-slate-200 bg-slate-50 px-3 py-2 sm:max-h-none sm:overflow-visible">
          <input
            className={`${inputCls} w-full sm:w-56`}
            placeholder="Search name, city, notes…"
            value={filters.search}
            onChange={(e) => f({ search: e.target.value })}
          />
          <MultiSelect
            label="Faculty"
            options={facOptions.map((v) => ({ value: v, label: v }))}
            selected={filters.faculties}
            onChange={(v) => f({ faculties: v })}
          />
          <MultiSelect
            label="Program"
            options={progOptions.map((v) => ({ value: v, label: v }))}
            selected={filters.programs}
            onChange={(v) => f({ programs: v })}
          />
          <MultiSelect
            label="Country"
            options={countries.map(([c, n]) => ({ value: c, label: `${flag(c)} ${countryName(c)}`, count: n }))}
            selected={filters.countries}
            onChange={(v) => f({ countries: v })}
          />
          <MultiSelect
            label="Status"
            options={STATUSES.map((s) => ({ value: s.value || "none", label: s.value ? s.label : "No status" }))}
            selected={filters.statuses}
            onChange={(v) => f({ statuses: v })}
          />
          <select className={`${inputCls} w-auto`} value={filters.minPriority} onChange={(e) => f({ minPriority: Number(e.target.value) })}>
            <option value={0}>Any priority</option>
            {[1, 2, 3, 4, 5].map((i) => (
              <option key={i} value={i}>
                ≥ {"★".repeat(i)}
              </option>
            ))}
          </select>
          <input className={`${inputCls} w-28`} placeholder="Language" value={filters.language} onChange={(e) => f({ language: e.target.value })} />
          <input className={`${inputCls} w-24`} placeholder="Tag" value={filters.tag} onChange={(e) => f({ tag: e.target.value })} />
          <select className={`${inputCls} w-auto`} value={filters.noteCategory} onChange={(e) => f({ noteCategory: e.target.value })}>
            <option value="">Notes: any</option>
            <option value="__any">Has notes</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                Has “{c}”
              </option>
            ))}
          </select>
          <select className={`${inputCls} w-auto`} value={filters.location} onChange={(e) => f({ location: e.target.value as Filters["location"] })}>
            <option value="">Location: any</option>
            <option value="ok">Located</option>
            <option value="approx">Approximate</option>
            <option value="missing">Missing</option>
          </select>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.hideExpired} onChange={(e) => f({ hideExpired: e.target.checked })} /> Hide expired
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={filters.showHidden} onChange={(e) => f({ showHidden: e.target.checked })} /> Show hidden
          </label>
          {activeFilterCount > 0 && (
            <button
              className="text-sm text-indigo-600 hover:underline"
              onClick={() =>
                setFilters({ ...defaultFilters(), faculties: filters.faculties, programs: filters.programs, onlyActive: filters.onlyActive })
              }
            >
              Reset filters
            </button>
          )}
        </div>
      )}

      {/* Content */}
      <div ref={splitRef} className={`flex min-h-0 flex-1 ${dragging ? "cursor-col-resize select-none" : ""}`}>
        {showTable && (
          <div
            style={showMap ? { width: `${splitPct}%` } : undefined}
            className={`relative flex min-w-0 flex-col ${showMap ? "shrink-0" : "flex-1"} ${dragging ? "pointer-events-none" : ""}`}
          >
            <div ref={tableRef} className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#e2e8f0]">
                  <tr>
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        className={`cursor-pointer select-none whitespace-nowrap px-2 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 ${c.cls ?? ""}`}
                        onClick={() => setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                      >
                        {c.label}
                        {sort.key === c.key && <span className="ml-1">{sort.dir === 1 ? "▲" : "▼"}</span>}
                      </th>
                    ))}
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((a) => {
                    const rd = state.row.get(a.id) ?? {};
                    const ud = state.uni.get(a.uniKey) ?? {};
                    const notes = state.notes.get(a.uniKey) ?? [];
                    const links = state.links.get(a.uniKey) ?? [];
                    const loc = locState(state, a.uniKey);
                    const expired = a.validToTs != null && a.validToTs < now;
                    const soon = !expired && a.validToTs != null && a.validToTs < now + 365 * 86400000;
                    const isRow = a.id === selectedRow;
                    const isUni = a.uniKey === selectedUni;
                    return (
                      <tr
                        key={a.id}
                        data-row={a.id}
                        onClick={() => selectFromTable(a)}
                        onDoubleClick={() => setDetailUni(a.uniKey)}
                        className={`cursor-pointer border-b border-slate-100 ${isRow ? "bg-indigo-100" : isUni ? "bg-indigo-50" : "hover:bg-slate-50"} ${rd.hidden ? "opacity-50" : ""}`}
                      >
                        <td className="px-2 py-1.5">
                          <Stars value={rd.priority ?? 0} disabled={ro} size="text-sm" onChange={(v) => store.setRow(a.id, { priority: v })} />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium leading-tight hover:text-indigo-700">{a.uniName}</div>
                          <div className="text-xs text-slate-400">
                            {a.uniCode}
                            {ud.city && ` · ${ud.city}`}
                            {ud.tags && ` · #${ud.tags.split(",").map((t) => t.trim()).filter(Boolean).join(" #")}`}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5" title={countryName(a.country)}>
                          {flag(a.country)} {a.country}
                        </td>
                        <td className="px-2 py-1.5">{a.faculty}</td>
                        <td className="px-2 py-1.5 text-xs">{a.program}</td>
                        <td className={`whitespace-nowrap px-2 py-1.5 text-xs ${expired ? "text-rose-600" : soon ? "text-amber-600" : ""}`}>
                          {a.validTo}
                          {!a.active && <div className="text-slate-400">inactive</div>}
                        </td>
                        <td className="px-2 py-1.5 text-xs">{ud.language}</td>
                        <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                          <select
                            disabled={ro}
                            value={rd.status ?? ""}
                            onChange={(e) => store.setRow(a.id, { status: e.target.value as RowStatus })}
                            className={`w-full rounded border-0 px-1 py-0.5 text-xs ${STATUSES.find((s) => s.value === (rd.status ?? ""))?.cls || "bg-transparent text-slate-400"}`}
                          >
                            {STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-xs">
                          <div className="inline-flex items-center gap-2">
                            {notes.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 text-slate-600"
                                title={[...new Set(notes.map((n) => n.category))].join(", ")}
                              >
                                <MessageSquareText className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                                {notes.length}
                              </span>
                            )}
                            {links.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-slate-600">
                                <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                                {links.length}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-center" title={loc === "missing" ? "No location" : loc === "approx" ? "Approximate" : "Located"}>
                          {loc === "ok" ? (
                            <MapPin className="mx-auto h-3.5 w-3.5 text-emerald-600" strokeWidth={1.75} />
                          ) : loc === "approx" ? (
                            <MapPin className="mx-auto h-3.5 w-3.5 text-amber-500" strokeWidth={1.75} />
                          ) : (
                            <HelpCircle className="mx-auto h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-1 py-1.5 text-right">
                          <button
                            className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title={rd.hidden ? "Show" : "Hide"}
                            disabled={ro}
                            onClick={(e) => {
                              e.stopPropagation();
                              store.setRow(a.id, { hidden: !rd.hidden });
                            }}
                          >
                            {rd.hidden ? (
                              <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                            ) : (
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                            )}
                          </button>
                          <button
                            className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            title="Details & notes"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectFromTable(a);
                              setDetailUni(a.uniKey);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!sorted.length && <div className="p-8 text-center text-slate-400">No agreements match the filters.</div>}
            </div>
            {detailGroup && (
              <div className="fixed inset-0 z-[1200] md:absolute md:inset-y-0 md:left-auto md:right-0 md:z-20 md:w-full md:max-w-md">
                <DetailPanel
                  key={detailGroup.uniKey}
                  uni={detailGroup}
                  state={state}
                  store={store}
                  selectedRow={selectedRow}
                  onSelectRow={(id) => {
                    setSelectedRow(id);
                    scrollToRow(id);
                  }}
                  onClose={() => setDetailUni(null)}
                  onStartPick={() => {
                    setPickUni(detailGroup.uniKey);
                    if (isMobile) {
                      setMobileTab("map");
                      setDetailUni(null);
                    } else {
                      setDesktopMap(true);
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
        {showTable && showMap && (
          <div
            role="separator"
            aria-orientation="vertical"
            title="Drag to resize (double-click to reset 50/50)"
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDoubleClick={() => setSplitPct(50)}
            className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors ${
              dragging ? "bg-indigo-500" : "bg-slate-200 hover:bg-indigo-400"
            }`}
          >
            <div className="h-8 w-0.5 rounded-full bg-slate-400 group-hover:bg-white" />
          </div>
        )}
        {showMap && (
          <div className={`relative min-w-0 flex-1 ${dragging ? "pointer-events-none" : ""}`}>
            <MapView
              points={points}
              selected={selectedUni}
              flyKey={flyKey}
              pickLabel={pickGroup?.name ?? null}
              onSelectUni={selectFromMap}
              onSelectRow={selectRowFromMap}
              onOpenDetails={(k) => {
                setSelectedUni(k);
                setDetailUni(k);
                if (isMobile) setMobileTab("table");
                else setDesktopTable(true);
              }}
              onPick={(lat, lon) => {
                if (pickUni) store.setUni(pickUni, { lat, lon, geoSource: "manual", geoLabel: "Picked on map" });
                setPickUni(null);
              }}
              onCancelPick={() => setPickUni(null)}
              missingCount={missing}
              geoStatus={
                geo.error ? (
                  <div className="text-rose-600">Auto-locate stopped: {geo.error}</div>
                ) : geoEnabled && geo.current ? (
                  <div className="flex items-center gap-1 text-indigo-700">
                    <Spinner className="h-3 w-3" /> Locating {geo.done + 1}/{geo.total}: <span className="max-w-40 truncate">{geo.current}</span>
                  </div>
                ) : null
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SyncBadge({ state, onRetry, onReconnect }: { state: StoreState; onRetry: () => void; onReconnect: () => void }) {
  if (state.kind === "local")
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
        <HardDrive className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>Saved in this browser</span>
      </span>
    );
  if (state.readOnly)
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
        <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span>View only</span>
      </span>
    );
  switch (state.status) {
    case "saving":
      return (
        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
          <Spinner className="h-3 w-3" /> Saving…
        </span>
      );
    case "auth":
      return (
        <button className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-200" onClick={onReconnect}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Session expired — reconnect</span>
        </button>
      );
    case "error":
      return (
        <button className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-200" onClick={onRetry} title={state.error}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Sync error — retry</span>
        </button>
      );
    default:
      return (
        <span
          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
          title={`Last sync ${new Date(state.lastSync).toLocaleTimeString()}`}
        >
          <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>Synced with Google Sheets</span>
        </span>
      );
  }
}
