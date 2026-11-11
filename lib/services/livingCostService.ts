"use client";
import { useEffect, useState } from "react";
import {
  type LivingCostResult,
  getBenchmarkLivingCost,
  toNumbeoCountry,
  extractCityForUni,
  buildNumbeoCompareUrl,
} from "./livingCostData";

export type { LivingCostResult };
export { extractCityForUni, buildNumbeoCompareUrl, toNumbeoCountry, getBenchmarkLivingCost };

const clientCache = new Map<string, LivingCostResult>();

export async function fetchLivingCost(
  city: string,
  country: string,
): Promise<LivingCostResult> {
  const normCity = city?.trim() || "";
  const normCountry = toNumbeoCountry(country || "");
  const key = `${normCity.toLowerCase()}|${normCountry.toLowerCase()}`;

  if (clientCache.has(key)) {
    return clientCache.get(key)!;
  }

  try {
    const params = new URLSearchParams({ city: normCity, country: normCountry });
    const res = await fetch(`/api/living-cost?${params}`);
    if (res.ok) {
      const data = (await res.json()) as LivingCostResult;
      if (data && data.hasData) {
        clientCache.set(key, data);
        return data;
      }
    }
  } catch {
    // network fallback below
  }

  const fallback = getBenchmarkLivingCost(normCity, normCountry);
  clientCache.set(key, fallback);
  return fallback;
}

export function useLivingCost(city: string, country: string) {
  const normCity = city?.trim() || "";
  const normCountry = toNumbeoCountry(country || "");
  const key = `${normCity.toLowerCase()}|${normCountry.toLowerCase()}`;

  // Initialize immediately with benchmark data so UI never shows empty or blank state
  const [data, setData] = useState<LivingCostResult>(() => {
    return clientCache.get(key) || getBenchmarkLivingCost(normCity, normCountry);
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initial = clientCache.get(key) || getBenchmarkLivingCost(normCity, normCountry);
    setData(initial);

    let cancelled = false;
    fetchLivingCost(normCity, normCountry).then((res) => {
      if (!cancelled && res) {
        setData(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normCity, normCountry, key]);

  return { data, loading };
}
