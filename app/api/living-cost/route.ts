import { NextRequest, NextResponse } from "next/server";
import {
  type LivingCostResult,
  getBenchmarkLivingCost,
  toNumbeoCountry,
  cleanCityMapping,
  buildNumbeoCompareUrl,
} from "@/lib/services/livingCostData";

export type { LivingCostResult };

const memoryCache = new Map<string, { data: LivingCostResult; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in memory

function extractDiff(html: string, pattern: RegExp): number | null {
  const m = html.match(pattern);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num)) return null;
  const dir = (m[2] || "").toLowerCase();
  const sign = dir === "lower" || dir === "less" ? -1 : 1;
  return Math.round(sign * num * 10) / 10;
}

function extractNumber(html: string, pattern: RegExp): number | null {
  const m = html.match(pattern);
  if (!m) return null;
  const rawNum = m[1].replace(/[^\d.,]/g, "").replace(",", ".");
  const num = parseFloat(rawNum);
  return isNaN(num) ? null : Math.round(num);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCity = searchParams.get("city") || "";
  const rawCountry = searchParams.get("country") || "";

  const city = cleanCityMapping(rawCity);
  const country = toNumbeoCountry(rawCountry);
  const cacheKey = `${city.toLowerCase()}|${country.toLowerCase()}`;

  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  const compareUrl = buildNumbeoCompareUrl(city, country);
  const cityUrl = city
    ? `https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(city)}?displayCurrency=EUR`
    : `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${encodeURIComponent(country)}&displayCurrency=EUR`;

  // Always prepare reliable benchmark data in case Numbeo blocks scraping or network fails
  const benchmarkFallback = getBenchmarkLivingCost(city, country);

  try {
    const res = await fetch(compareUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      memoryCache.set(cacheKey, { data: benchmarkFallback, ts: Date.now() });
      return NextResponse.json(benchmarkFallback, {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    const html = await res.text();

    const costOfLivingDiff = extractDiff(
      html,
      /Cost of Living in .*? is\s*([\d.,]+)%\s*(?:<[^>]+>)?\s*(lower|higher|less|more)/i,
    );
    const costOfLivingPlusRentDiff = extractDiff(
      html,
      /Cost of Living Including Rent in .*? is\s*([\d.,]+)%\s*(?:<[^>]+>)?\s*(lower|higher|less|more)/i,
    );
    const rentDiff = extractDiff(
      html,
      /Rent Prices in .*? are\s*([\d.,]+)%\s*(?:<[^>]+>)?\s*(lower|higher|less|more)/i,
    );
    const restaurantDiff = extractDiff(
      html,
      /Restaurant Prices in .*? are\s*([\d.,]+)%\s*(?:<[^>]+>)?\s*(lower|higher|less|more)/i,
    );
    const groceriesDiff = extractDiff(
      html,
      /Groceries Prices in .*? are\s*([\d.,]+)%\s*(?:<[^>]+>)?\s*(lower|higher|less|more)/i,
    );

    const singlePersonEstEur = extractNumber(
      html,
      /estimated monthly costs for a single person are\s*(?:&#8364;|€)?\s*([\d,.]+)/i,
    );

    const hasData = costOfLivingDiff !== null || rentDiff !== null;

    if (!hasData) {
      memoryCache.set(cacheKey, { data: benchmarkFallback, ts: Date.now() });
      return NextResponse.json(benchmarkFallback);
    }

    const data: LivingCostResult = {
      city,
      country,
      hasData: true,
      costOfLivingDiff: costOfLivingDiff ?? benchmarkFallback.costOfLivingDiff,
      costOfLivingPlusRentDiff: costOfLivingPlusRentDiff ?? benchmarkFallback.costOfLivingPlusRentDiff,
      rentDiff: rentDiff ?? benchmarkFallback.rentDiff,
      restaurantDiff: restaurantDiff ?? benchmarkFallback.restaurantDiff,
      groceriesDiff: groceriesDiff ?? benchmarkFallback.groceriesDiff,
      singlePersonEstEur: singlePersonEstEur ?? benchmarkFallback.singlePersonEstEur,
      compareUrl,
      cityUrl,
      source: "Numbeo",
    };

    memoryCache.set(cacheKey, { data, ts: Date.now() });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    memoryCache.set(cacheKey, { data: benchmarkFallback, ts: Date.now() });
    return NextResponse.json(benchmarkFallback);
  }
}
