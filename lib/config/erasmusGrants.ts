"use client";
/**
 * Configurable Erasmus+ Grant rates by country group.
 * Allows user to customize amounts, reassign countries, and create new categories.
 */

export interface GrantCategory {
  id: string;
  name: string;
  monthlyAmount: number; // e.g. 670 (€/mo)
  countries: string[]; // ISO2 codes, e.g. ["DK", "FI", ...]
}

export const DEFAULT_GRANT_CATEGORIES: GrantCategory[] = [
  {
    id: "group-1",
    name: "Group 1 (Higher living costs)",
    monthlyAmount: 670,
    countries: ["DK", "FI", "IS", "IE", "LI", "LU", "NO", "SE", "GB", "UK"],
  },
  {
    id: "group-2",
    name: "Group 2 (Medium living costs)",
    monthlyAmount: 600,
    countries: ["AT", "BE", "CY", "FR", "DE", "EL", "GR", "IT", "MT", "NL", "PT", "ES"],
  },
  {
    id: "group-3",
    name: "Group 3 (Lower living costs)",
    monthlyAmount: 540,
    countries: ["BG", "HR", "CZ", "EE", "HU", "LV", "LT", "PL", "RO", "RS", "SK", "SI", "MK", "TR"],
  },
];

const STORAGE_KEY = "erasmus-user-grants-v1";

export function loadGrantCategories(): GrantCategory[] {
  if (typeof window === "undefined") return DEFAULT_GRANT_CATEGORIES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_GRANT_CATEGORIES;
}

export function saveGrantCategories(categories: GrantCategory[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch {
    /* quota */
  }
}

export function resetGrantCategories(): GrantCategory[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return DEFAULT_GRANT_CATEGORIES;
}

/** Get the grant category matching a given ISO2 country code. */
export function getGrantForCountry(
  countryCode: string,
  categories: GrantCategory[] = DEFAULT_GRANT_CATEGORIES,
): GrantCategory | null {
  const cc = (countryCode || "").toUpperCase().trim();
  if (!cc) return null;
  return categories.find((cat) => cat.countries.includes(cc)) ?? null;
}
