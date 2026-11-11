"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Eye, Pause, Play } from "lucide-react";
import { countryName } from "@/lib/countries";
import { locateUniversity } from "@/lib/services/geocodingService";
import { exportAgreementsCsv, exportNotesJson, parseImportFile } from "@/lib/services/exportService";
import {
  type GrantCategory,
  getGrantForCountry,
  loadGrantCategories,
  saveGrantCategories,
} from "@/lib/config/erasmusGrants";
import type { RecordStore } from "@/lib/store";
import type { Source } from "@/lib/session";
import { NOTE_CATEGORIES, STATUSES, type Agreement, type Filters } from "@/lib/types";
import { DetailPanel, type UniGroup } from "./DetailPanel";
import type { MapPoint } from "./MapView";
import { b, Spinner } from "./ui";
import { useToast } from "./ui/Toast";
import { useColumnVisibility } from "@/lib/hooks/useColumnVisibility";
import { useComparison } from "@/lib/hooks/useComparison";
import { usePagination } from "@/lib/hooks/usePagination";
import { useUIStore } from "@/lib/stores/uiStore";
import { TopBar } from "./main/TopBar";
import { FilterBar } from "./main/FilterBar";
import { AgreementsTable, type SortKey } from "./main/AgreementsTable";
import { PaginationBar } from "./main/PaginationBar";
import { SplitPane } from "./main/SplitPane";
import { ComparisonFloatingBar } from "./main/ComparisonFloatingBar";
import { ComparisonModal } from "./main/ComparisonModal";
import { ExportModal } from "./main/ExportModal";
import { BudgetEditorModal } from "./main/BudgetEditorModal";
import { locState } from "./main/TableRow";

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
  const { showToast } = useToast();
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const isMobile = useSyncExternalStore(subscribeMobile, getIsMobile, getIsMobileServer);

  const [ui, uiStoreActions] = useUIStore();
  const showTable = isMobile ? ui.mobileTab === "table" : ui.desktopTable;
  const showMap = isMobile ? ui.mobileTab === "map" : ui.desktopMap;

  // Grants state: synchronizes with Google Sheets backend (state.grants) and localStorage fallback
  const [grantCategories, setGrantCategories] = useState<GrantCategory[]>(
    () => state.grants ?? loadGrantCategories(),
  );

  useEffect(() => {
    if (state.grants && state.grants.length > 0) {
      setGrantCategories(state.grants);
    }
  }, [state.grants]);

  // Selection & Detail Panel State
  const [selectedUni, setSelectedUni] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [detailUni, setDetailUni] = useState<string | null>(null);
  const [isDetailFullscreen, setIsDetailFullscreen] = useState(false);
  const [pickUni, setPickUni] = useState<string | null>(null);
  const [flyKey, setFlyKey] = useState(0);

  // Sorting, Columns, Comparison
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "priority", dir: -1 });
  const comparison = useComparison(4);

  // Geocoding queue state
  const [geoEnabled, setGeoEnabled] = useState(true);
  const [geo, setGeo] = useState({ done: 0, total: 0, current: "", error: "" });

  const tableRef = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!detailUni || !isDetailFullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDetailFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [detailUni, isDetailFullscreen]);

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

  // Distinct faculties and programs options
  const facOptions = useMemo(() => [...new Set(props.agreements.map((a) => orEmpty(a.faculty)))].sort(), [props.agreements]);
  const progOptions = useMemo(() => [...new Set(props.agreements.map((a) => orEmpty(a.program)))].sort(), [props.agreements]);

  // Column visibility hook with dynamic default hiding for single faculty or program
  const { visibility, toggleColumn, resetColumns } = useColumnVisibility({
    facultyCount: facOptions.length,
    programCount: progOptions.length,
  });

  // University groups (over the base set)
  const groups = useMemo(() => {
    const m = new Map<string, UniGroup>();
    for (const a of base) {
      let g = m.get(a.uniKey);
      if (!g) m.set(a.uniKey, (g = { uniKey: a.uniKey, name: a.uniName, country: a.country, code: a.uniCode, agreements: [] }));
      g.agreements.push(a);
      if (a.uniName && a.uniName.length < g.name.length) g.name = a.uniName;
    }
    return m;
  }, [base]);

  // 2) Visible agreements (filtered)
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

  // 3) Sorted agreements
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
        case "budget":
          return getGrantForCountry(a.country, grantCategories)?.monthlyAmount ?? 0;
        case "status":
          return STATUSES.findIndex((s) => s.value === (rd.status ?? ""));
        case "notes":
          return (state.notes.get(a.uniKey)?.length ?? 0) + (state.links.get(a.uniKey)?.length ?? 0);
        case "location":
          return ["missing", "unresolved", "auto", "exact", "manual"].indexOf(locState(state, a.uniKey));
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
  }, [visible, sort, state, grantCategories]);

  // 4) Pagination
  const pagination = usePagination(sorted, 50);

  // 5) Map points
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
      const loc = locState(state, uniKey);
      pts.push({
        uniKey,
        name: g.name,
        country: g.country,
        lat: d.lat,
        lon: d.lon,
        approx: loc === "unresolved",
        locStatus: loc === "missing" ? "unresolved" : loc,
        priority: Math.max(0, ...rows.map((r) => state.row.get(r.id)?.priority ?? 0)),
        data: d,
        agreements: rows,
        noteCount: state.notes.get(uniKey)?.length ?? 0,
      });
    });
    return { points: pts, missing: miss };
  }, [visible, state, groups]);

  // Background auto-geocoding loop — only locates universities matching active filters
  const visibleUniKeys = useMemo(() => new Set(visible.map((a) => a.uniKey)), [visible]);
  const visibleUniKeysHash = useMemo(() => [...visibleUniKeys].sort().join("|"), [visibleUniKeys]);

  useEffect(() => {
    if (!geoEnabled) return;
    let cancelled = false;
    const needs = (k: string) => {
      const d = store.getSnapshot().uni.get(k);
      return !d || (d.lat == null && !d.geoSource);
    };
    (async () => {
      // Only process universities that are part of the visible/filtered set
      const todo = [...groups.values()].filter((g) => visibleUniKeys.has(g.uniKey) && needs(g.uniKey));
      let done = 0;
      for (const g of todo) {
        if (cancelled) return;
        if (!needs(g.uniKey)) {
          done++;
          continue;
        }
        setGeo({ done, total: todo.length, current: g.name, error: "" });
        const t0 = performance.now();
        try {
          const r = await locateUniversity(g.name, g.country, g.code);
          if (cancelled) return;
          store.setUni(
            g.uniKey,
            r ? { lat: r.lat, lon: r.lon, geoSource: r.source, geoScore: r.score, geoLabel: r.label } : { geoSource: "failed" },
          );
        } catch (e) {
          if (!cancelled) setGeo((s) => ({ ...s, error: (e as Error).message, current: "" }));
          return;
        }
        done++;

        // Polite pacing: if network request took time, wait ~1200ms to avoid locking UI or rate limits.
        // If instant/cached, yield event loop briefly (25ms) so React remains smooth.
        const elapsed = performance.now() - t0;
        const delayMs = elapsed > 50 ? 1200 : 25;
        await new Promise((res) => setTimeout(res, delayMs));
        if (cancelled) return;
      }
      if (!cancelled) setGeo({ done: todo.length, total: todo.length, current: "", error: "" });
    })();
    return () => {
      cancelled = true;
    };
  }, [geoEnabled, visibleUniKeysHash]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close detail panel on Escape key
  useEffect(() => {
    if (!detailUni) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailUni(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [detailUni]);

  // Selection handlers
  const scrollToRow = (rowId: string) =>
    requestAnimationFrame(() =>
      tableRef.current?.querySelector(`[data-row="${CSS.escape(rowId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );

  const selectFromTable = (a: Agreement) => {
    const alreadySelected = selectedRow === a.id;
    setSelectedUni(a.uniKey);
    setSelectedRow(a.id);
    setFlyKey((k) => k + 1);
    if (ui.openOnClick || detailUni || alreadySelected) setDetailUni(a.uniKey);
  };

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

  // Filter Bar Data Options
  const countries = useMemo(() => {
    const m = new Map<string, number>();
    base.forEach((a) => m.set(a.country, (m.get(a.country) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => countryName(a[0]).localeCompare(countryName(b[0])));
  }, [base]);

  const categories = useMemo(() => {
    const s = new Set(NOTE_CATEGORIES);
    state.notes.forEach((arr) => arr.forEach((n) => s.add(n.category)));
    return [...s];
  }, [state.notes]);

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

  // Actions
  const handleExportJson = () => {
    exportNotesJson(store.exportAll());
    showToast("Notes exported to JSON file", "success");
  };

  const handleExportCsv = () => {
    exportAgreementsCsv(visible);
    showToast(`Exported ${visible.length} agreements to CSV`, "success");
  };

  const handleSuperImport = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const records = await parseImportFile(file);
        store.importAll(records);
        showToast(`Imported ${records.length} records successfully!`, "success");
        return;
      }
      showToast(`Spreadsheet "${file.name}" detected. To switch open files, use 'Close file' in the menu.`, "info", 5000);
    } catch (e) {
      showToast(`Import failed: ${(e as Error).message}`, "error");
    }
  };

  const handleShareLink = () => {
    if (props.source.kind !== "google") return;
    const url = `${location.origin}${location.pathname}?sheet=${props.source.spreadsheetId}`;
    void navigator.clipboard.writeText(url);
    showToast(`Shareable link copied to clipboard!\nMake sure your friend has Drive access.`, "success", 5000);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <TopBar
        source={props.source}
        state={state}
        sortedCount={sorted.length}
        baseCount={base.length}
        uniCount={groups.size}
        isMobile={isMobile}
        activeFilterCount={activeFilterCount}
        columnVisibility={visibility}
        onToggleColumn={toggleColumn}
        onResetColumns={resetColumns}
        onEditSetup={props.onEditSetup}
        onOpenBudgetEditor={() => uiStoreActions.setIsBudgetEditorOpen(true)}
        onShareLink={props.source.kind === "google" ? handleShareLink : undefined}
        onOpenExport={() => uiStoreActions.setIsExportModalOpen(true)}
        onSuperImport={handleSuperImport}
        onRetrySync={() => store.retry()}
        onReconnect={props.onReconnect}
        onClose={props.onClose}
      />

      {state.readOnly && (
        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
          <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          <span>View-only access: your changes are not saved.</span>
          <button className={b("secondary", "py-0.5 text-xs")} onClick={props.onMakeCopy}>
            Make an editable copy
          </button>
        </div>
      )}

      {/* Filter Bar */}
      {ui.showFilters && (
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          facOptions={facOptions}
          progOptions={progOptions}
          countries={countries}
          categories={categories}
          activeFilterCount={activeFilterCount}
        />
      )}

      {/* Main Content (Split Pane with Table & Map) */}
      <SplitPane
        showLeft={showTable}
        showRight={showMap}
        leftContent={
          <div className="relative flex h-full min-w-0 flex-col bg-white dark:bg-slate-950">
            <AgreementsTable
              agreements={pagination.pagedItems}
              state={state}
              store={store}
              sort={sort}
              setSort={setSort}
              selectedRow={selectedRow}
              selectedUni={selectedUni}
              comparedKeys={comparison.selectedKeys}
              onToggleCompare={comparison.toggle}
              onSelectAgreement={selectFromTable}
              onDoubleClickRow={(uniKey) => setDetailUni(uniKey)}
              onOpenDetails={(uniKey) => {
                setSelectedUni(uniKey);
                setDetailUni(uniKey);
              }}
              visibility={visibility}
              grantCategories={grantCategories}
              tableRef={tableRef}
              now={now}
            />

            <PaginationBar
              page={pagination.page}
              setPage={pagination.setPage}
              pageSize={pagination.pageSize}
              setPageSize={pagination.setPageSize}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              showingCount={pagination.pagedItems.length}
            />

            {/* University Details Drawer / Modal */}
            {detailGroup && (
              <div
                className={
                  isDetailFullscreen
                    ? "fixed inset-0 z-[1300] flex items-center justify-center p-2 sm:p-5 bg-slate-900/60 backdrop-blur-xs"
                    : "fixed inset-0 z-[1200] flex justify-end bg-slate-900/40 backdrop-blur-xs md:bg-transparent md:backdrop-blur-none md:absolute md:inset-y-0 md:left-auto md:right-0 md:z-20 md:w-full md:max-w-md"
                }
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setDetailUni(null);
                    setIsDetailFullscreen(false);
                  }
                }}
              >
                <div
                  className={
                    isDetailFullscreen
                      ? "relative flex flex-col h-[94vh] w-full max-w-5xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden border border-slate-200 dark:border-slate-800"
                      : "h-full w-full max-w-md"
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <DetailPanel
                    key={detailGroup.uniKey}
                    uni={detailGroup}
                    state={state}
                    store={store}
                    selectedRow={selectedRow}
                    isFullscreen={isDetailFullscreen}
                    isMobile={isMobile}
                    onToggleFullscreen={isMobile ? undefined : () => setIsDetailFullscreen((v) => !v)}
                    onSelectRow={(id) => {
                      setSelectedRow(id);
                      scrollToRow(id);
                    }}
                    onClose={() => {
                      setDetailUni(null);
                      setIsDetailFullscreen(false);
                    }}
                    onStartPick={() => {
                      setPickUni(detailGroup.uniKey);
                      setIsDetailFullscreen(false);
                      if (isMobile) {
                        uiStoreActions.setMobileTab("map");
                        setDetailUni(null);
                      } else {
                        uiStoreActions.setDesktopMap(true);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        }
        rightContent={
          <MapView
            points={points}
            selected={selectedUni}
            flyKey={flyKey}
            pickLabel={pickGroup?.name ?? null}
            clusterMarkers={ui.clusterMarkers}
            onSelectUni={selectFromMap}
            onSelectRow={selectRowFromMap}
            onOpenDetails={(k) => {
              setSelectedUni(k);
              setDetailUni(k);
              if (isMobile) uiStoreActions.setMobileTab("table");
              else uiStoreActions.setDesktopTable(true);
            }}
            onPick={(lat, lon) => {
              if (pickUni) store.setUni(pickUni, { lat, lon, geoSource: "manual", geoScore: 100, geoLabel: "Picked on map" });
              setPickUni(null);
            }}
            onCancelPick={() => setPickUni(null)}
            missingCount={missing}
            geoStatus={
              geo.error ? (
                <div className="flex items-center justify-between gap-2 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                  <span className="truncate">Auto-locate stopped: {geo.error}</span>
                  <button
                    onClick={() => {
                      setGeo((g) => ({ ...g, error: "" }));
                      setGeoEnabled(true);
                    }}
                    className="underline hover:no-underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : geoEnabled && geo.current ? (
                <div className="flex items-center gap-2 rounded-md bg-indigo-50/90 px-2 py-1 text-xs text-indigo-700 transition-colors hover:bg-indigo-100/90 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/80">
                  <button
                    type="button"
                    onClick={() => setGeoEnabled(false)}
                    title="Pause auto-locating"
                    className="inline-flex items-center gap-1 rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-700 shadow-xs hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
                  >
                    <Pause className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span>Pause</span>
                  </button>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Spinner className="h-3 w-3 shrink-0" />
                    <span className="font-semibold shrink-0">Locating {geo.done + 1}/{geo.total}:</span>
                    <span className="max-w-36 truncate">{geo.current}</span>
                  </div>
                </div>
              ) : !geoEnabled && missing > 0 ? (
                <div className="flex items-center gap-2 rounded-md bg-slate-100/90 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => setGeoEnabled(true)}
                    title="Resume auto-locating"
                    className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2 py-0.5 text-[11px] font-medium text-white shadow-xs hover:bg-indigo-700 shrink-0"
                  >
                    <Play className="h-2.5 w-2.5 fill-current" />
                    <span>Continue</span>
                  </button>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    Auto-locate paused ({geo.done}/{geo.total || missing})
                  </span>
                </div>
              ) : null
            }
          />
        }
      />

      {/* Floating comparison badge (shows when 2+ universities selected) */}
      <ComparisonFloatingBar
        count={comparison.count}
        onOpen={() => comparison.setIsOpen(true)}
        onClear={comparison.clear}
      />

      {/* University Side-by-side comparison modal matrix */}
      <ComparisonModal
        isOpen={comparison.isOpen}
        onClose={() => comparison.setIsOpen(false)}
        comparedKeys={comparison.selectedKeys}
        onRemove={comparison.remove}
        allAgreements={props.agreements}
        selectedFaculties={filters.faculties}
        state={state}
        grantCategories={grantCategories}
        onOpenDetails={(uniKey) => {
          setSelectedUni(uniKey);
          setDetailUni(uniKey);
          if (isMobile) uiStoreActions.setMobileTab("table");
          else uiStoreActions.setDesktopTable(true);
        }}
      />

      {/* Export Format Modal */}
      <ExportModal
        isOpen={ui.isExportModalOpen}
        onClose={() => uiStoreActions.setIsExportModalOpen(false)}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        agreementCount={visible.length}
      />

      {/* User-editable Erasmus Grants & Budget Modal */}
      <BudgetEditorModal
        isOpen={ui.isBudgetEditorOpen}
        onClose={() => uiStoreActions.setIsBudgetEditorOpen(false)}
        categories={grantCategories}
        onSave={(cats) => {
          setGrantCategories(cats);
          saveGrantCategories(cats);
          store.setGrants(cats);
          showToast("Grant categories saved to spreadsheet", "success");
        }}
      />
    </div>
  );
}
