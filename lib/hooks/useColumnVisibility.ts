"use client";
import { useCallback, useMemo, useState } from "react";

export type ColumnKey =
  | "priority"
  | "uniName"
  | "country"
  | "faculty"
  | "program"
  | "validTo"
  | "language"
  | "budget"
  | "status"
  | "notes"
  | "location";

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  required?: boolean;
}

export const ALL_COLUMNS: ColumnDef[] = [
  { key: "priority", label: "Priority" },
  { key: "uniName", label: "University", required: true },
  { key: "country", label: "Country" },
  { key: "faculty", label: "Faculty" },
  { key: "program", label: "Program" },
  { key: "validTo", label: "Valid until" },
  { key: "language", label: "Language" },
  { key: "budget", label: "Grant / Budget" },
  { key: "status", label: "Status" },
  { key: "notes", label: "Notes / links" },
  { key: "location", label: "Location status" },
];

const STORAGE_KEY = "erasmus-column-visibility-v2";

const BASE_DEFAULT_VISIBILITY: Record<ColumnKey, boolean> = {
  priority: true,
  uniName: true,
  country: true,
  faculty: true,
  program: true,
  validTo: true,
  language: true,
  budget: false, // Hidden by default
  status: true,
  notes: true,
  location: true,
};

export function useColumnVisibility(options?: {
  facultyCount?: number;
  programCount?: number;
}) {
  const [userOverrides, setUserOverrides] = useState<Partial<Record<ColumnKey, boolean>>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return {};
  });

  const facultyCount = options?.facultyCount ?? 99;
  const programCount = options?.programCount ?? 99;

  // Auto-hide faculty or program if there is only 1 in the dataset/filter,
  // unless the user explicitly toggled it in the menu.
  const visibility = useMemo<Record<ColumnKey, boolean>>(() => {
    const computed = { ...BASE_DEFAULT_VISIBILITY };

    if (facultyCount <= 1 && userOverrides.faculty === undefined) {
      computed.faculty = false;
    }
    if (programCount <= 1 && userOverrides.program === undefined) {
      computed.program = false;
    }

    return { ...computed, ...userOverrides };
  }, [userOverrides, facultyCount, programCount]);

  const toggleColumn = useCallback((key: ColumnKey) => {
    setUserOverrides((prev) => {
      const currentVal = prev[key] !== undefined ? prev[key] : BASE_DEFAULT_VISIBILITY[key];
      const next = { ...prev, [key]: !currentVal };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    setUserOverrides({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const isVisible = useCallback((key: ColumnKey) => visibility[key] ?? true, [visibility]);

  return { visibility, toggleColumn, resetColumns, isVisible };
}
