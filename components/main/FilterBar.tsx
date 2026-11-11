"use client";
import React, { useEffect, useState } from "react";
import type { Filters } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { countryName, flag } from "@/lib/countries";
import { defaultFilters } from "@/lib/session";
import { inputCls, MultiSelect } from "@/components/ui";
import { useDebounce } from "@/lib/hooks/useDebounce";

export function FilterBar({
  filters,
  setFilters,
  facOptions,
  progOptions,
  countries,
  categories,
  activeFilterCount,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  facOptions: string[];
  progOptions: string[];
  countries: [string, number][];
  categories: string[];
  activeFilterCount: number;
}) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebounce(searchInput, 160);

  // Sync debounced search to filters
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      setFilters({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync external search reset to local input
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (filters.search !== searchInput && filters.search === "") {
      setSearchInput("");
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [filters.search, searchInput]);

  const f = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div className="flex max-h-[45vh] flex-wrap items-center gap-1.5 overflow-y-auto border-b border-slate-200 bg-slate-50 px-3 py-2 sm:max-h-none sm:overflow-visible dark:border-slate-800 dark:bg-slate-900/70">
      <input
        className={`${inputCls} w-full sm:w-56`}
        placeholder="Search name, city, notes…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
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

      <select
        className={`${inputCls} w-auto`}
        value={filters.minPriority}
        onChange={(e) => f({ minPriority: Number(e.target.value) })}
      >
        <option value={0}>Any priority</option>
        {[1, 2, 3, 4, 5].map((i) => (
          <option key={i} value={i}>
            ≥ {"★".repeat(i)}
          </option>
        ))}
      </select>

      <input
        className={`${inputCls} w-28`}
        placeholder="Language"
        value={filters.language}
        onChange={(e) => f({ language: e.target.value })}
      />

      <input
        className={`${inputCls} w-24`}
        placeholder="Tag"
        value={filters.tag}
        onChange={(e) => f({ tag: e.target.value })}
      />

      <select
        className={`${inputCls} w-auto`}
        value={filters.noteCategory}
        onChange={(e) => f({ noteCategory: e.target.value })}
      >
        <option value="">Notes: any</option>
        <option value="__any">Has notes</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            Has “{c}”
          </option>
        ))}
      </select>

      <select
        className={`${inputCls} w-auto`}
        value={filters.location}
        onChange={(e) => f({ location: e.target.value as Filters["location"] })}
      >
        <option value="">Location: any</option>
        <option value="exact">Exact match</option>
        <option value="auto">Resolved automatically</option>
        <option value="unresolved">Unresolved</option>
        <option value="manual">Manual</option>
        <option value="missing">Missing</option>
      </select>

      <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={filters.hideExpired}
          onChange={(e) => f({ hideExpired: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
        />{" "}
        Hide expired
      </label>

      <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={filters.showHidden}
          onChange={(e) => f({ showHidden: e.target.checked })}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
        />{" "}
        Show hidden
      </label>

      {activeFilterCount > 0 && (
        <button
          className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          onClick={() => {
            setSearchInput("");
            setFilters({
              ...defaultFilters(),
              faculties: filters.faculties,
              programs: filters.programs,
              onlyActive: filters.onlyActive,
            });
          }}
        >
          Reset filters
        </button>
      )}
    </div>
  );
}
