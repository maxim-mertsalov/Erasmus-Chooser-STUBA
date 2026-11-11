import { countryName, toIso2 } from "../countries";
import {
  ERASMUS_CODE_CITIES,
  KNOWN_STUDENT_CITIES,
  KNOWN_EUROPEAN_CITIES,
  COUNTRIES_SET,
  REGIONS_SET,
  DISTRICT_TO_METRO,
  NUMBEO_COUNTRY_MAP,
  NUMBEO_CITY_MAPPING,
} from "../data/geoDictionaries";
import {
  type BenchmarkData,
  CITY_BENCHMARKS,
  COUNTRY_BENCHMARKS,
} from "../data/livingCostBenchmarks";

export interface LivingCostResult {
  city: string;
  country: string;
  hasData: boolean;
  costOfLivingDiff: number | null; // % relative to Bratislava (negative = cheaper, positive = more expensive)
  costOfLivingPlusRentDiff: number | null;
  rentDiff: number | null;
  restaurantDiff: number | null;
  groceriesDiff: number | null;
  singlePersonEstEur: number | null;
  compareUrl: string;
  cityUrl: string;
  source: string;
}

// Re-export static dictionaries for consumers that import from livingCostData
export {
  ERASMUS_CODE_CITIES,
  KNOWN_STUDENT_CITIES,
  KNOWN_EUROPEAN_CITIES,
  COUNTRIES_SET,
  REGIONS_SET,
  DISTRICT_TO_METRO,
  NUMBEO_COUNTRY_MAP,
  NUMBEO_CITY_MAPPING,
  type BenchmarkData,
  CITY_BENCHMARKS,
  COUNTRY_BENCHMARKS,
};

export function cleanCityMapping(raw: string): string {
  const norm = raw.trim();
  const low = norm.toLowerCase();
  if (DISTRICT_TO_METRO[low]) return DISTRICT_TO_METRO[low];

  const MAP: Record<string, string> = {
    Praha: "Prague",
    Wien: "Vienna",
    München: "Munich",
    Warszawa: "Warsaw",
    Kraków: "Krakow",
    Versail: "Versailles",
    Eperon: "Caen",
    Épron: "Caen",
    Epron: "Caen",
    Seoul: "Seoul",
    Taiyuan: "Taiyuan",
    Tainan: "Tainan",
    Vientiane: "Vientiane",
    Trashigang: "Trashigang",
    Roma: "Rome",
    Milano: "Milan",
    Lisboa: "Lisbon",
    Bruxelles: "Brussels",
    København: "Copenhagen",
    Kobenhavn: "Copenhagen",
    "České Budějovice": "Ceske Budejovice",
    Plzeň: "Pilsen",
    Wrocław: "Wroclaw",
    Poznań: "Poznan",
    Gdańsk: "Gdansk",
    Łódź: "Lodz",
    Firenze: "Florence",
    Torino: "Turin",
    Napoli: "Naples",
    Padova: "Padua",
    Genova: "Genoa",
    Köln: "Cologne",
    Düsseldorf: "Dusseldorf",
    Nürnberg: "Nuremberg",
  };
  return MAP[norm] || norm;
}

// Robust university city extractor
export function extractCityForUni(
  geoLabel?: string,
  code?: string,
  uniName?: string,
  country?: string,
): string {
  // Step 1: Check Erasmus Code
  let codeFallbackCandidate = "";
  if (code) {
    const normCode = code.trim().replace(/\s+(\d+)$/, "$1");
    const parts = normCode.split(/\s+/);
    if (parts.length >= 2) {
      const cityToken = parts[parts.length - 1].replace(/\d+$/, "").toUpperCase();
      if (ERASMUS_CODE_CITIES[cityToken]) {
        return ERASMUS_CODE_CITIES[cityToken];
      }
      for (const [k, v] of Object.entries(ERASMUS_CODE_CITIES)) {
        if (cityToken.startsWith(k) || k.startsWith(cityToken)) {
          return v;
        }
      }
      if (cityToken.length >= 3) {
        const candidate = cityToken.charAt(0) + cityToken.slice(1).toLowerCase();
        codeFallbackCandidate = cleanCityMapping(candidate);
      }
    }
  }

  // Step 2: Check University Name for known major cities or campuses
  if (uniName) {
    if (/\banhalt\b/i.test(uniName)) {
      return "Dessau";
    }
    for (const city of KNOWN_STUDENT_CITIES) {
      const re = new RegExp(`\\b${city}\\b`, "i");
      if (re.test(uniName)) {
        return cleanCityMapping(city);
      }
    }
    const inMatch = uniName.match(/\b(?:in|at|de|di|v|v\s+|u)\s+([A-Z\p{L}][a-z\p{L}]+)\b/u);
    if (inMatch) {
      const cand = inMatch[1].trim();
      const low = cand.toLowerCase();
      if (!COUNTRIES_SET.has(low) && !REGIONS_SET.has(low) && cand.length >= 3) {
        return cleanCityMapping(cand);
      }
    }
  }

  // Step 2.5: Check if any known student city appears anywhere in geoLabel as a whole word
  if (geoLabel) {
    for (const city of KNOWN_STUDENT_CITIES) {
      const re = new RegExp(`\\b${city}\\b`, "i");
      if (re.test(geoLabel)) {
        return cleanCityMapping(city);
      }
    }
  }

  // Step 3: Parse Nominatim address (geoLabel)
  if (geoLabel) {
    const rawParts = geoLabel.split(",").map((s) => s.trim()).filter(Boolean);
    const cleaned: string[] = [];
    const cLow = (country || "").toLowerCase().trim();

    for (let i = 0; i < rawParts.length; i++) {
      const p = rawParts[i];
      const low = p.toLowerCase();
      // Postal code (e.g. "06570", "34440", "6330", "69100", "4400-103", "03788", "42001", "70101", "EC1A 1BB")
      if (/^\d{3,6}(-\d+)?$/.test(p) || /^[A-Za-z]?\d{4,6}$/.test(p) || /^[A-Z0-9]{2,4}\s+[A-Z0-9]{2,4}$/i.test(p)) {
        continue;
      }
      // Country (last token in Nominatim address is always the country, or match known country names)
      if (
        i === rawParts.length - 1 ||
        COUNTRIES_SET.has(low) ||
        NUMBEO_COUNTRY_MAP[low] ||
        (cLow && low === cLow)
      ) {
        continue;
      }
      // Admin / Region (including Turkish, Asian, and European administrative divisions)
      if (
        REGIONS_SET.has(low) ||
        /\b(bezirk|landkreis|kreis|métropole|metropole|région|region|département|departement|provincia|province|województwo|kraj|community|district|county|bölgesi|bolgesi|prefecture|gewog|village)\b/i.test(
          p,
        )
      ) {
        continue;
      }
      // Street / Road / Quarter / Neighborhood words across languages (including Korean -ro, -dong, -gu, -ri)
      if (
        /^\d+$/.test(p) ||
        /\b(gasse|strasse|straße|rue|avenue|av\.|avda|calle|via|impasse|boulevard|chemin|route|square|plac|ulica|ul\.|mahallesi|mah\.|bulvarı|bulvari|sokağı|sokagi|sokak|caddesi|cad\.|yerleşkesi|yerleskesi|yerleşke|yerleske|road|highway|lane|street|st\.|dr\.|drive)\b/i.test(
          p,
        ) ||
        /-(ro|gil|dong|gu|eup|myeon|ri)$/i.test(p) ||
        /\b(hun-ri|sinchon-dong|seodaemun-gu|seongsan-ro)\b/i.test(p)
      ) {
        continue;
      }
      // First part if it matches the university name
      if (i === 0 && uniName && (p.toLowerCase().includes(uniName.toLowerCase()) || uniName.toLowerCase().includes(p.toLowerCase()))) {
        continue;
      }

      cleaned.push(p);
    }

    if (cleaned.length > 0) {
      // Prioritize tokens that match our known cities or districts
      for (const token of cleaned) {
        const low = token.toLowerCase();
        if (DISTRICT_TO_METRO[low]) {
          return DISTRICT_TO_METRO[low];
        }
        for (const city of KNOWN_STUDENT_CITIES) {
          if (low === city.toLowerCase()) {
            return cleanCityMapping(city);
          }
        }
      }
      // Otherwise use the most specific municipality (last token before country/region)
      return cleanCityMapping(cleaned[cleaned.length - 1]);
    }
  }

  // Step 3.5: Fallback to unrecognized code candidate if uniName and geoLabel yielded nothing
  if (codeFallbackCandidate) {
    return codeFallbackCandidate;
  }

  // Step 4: Fallback from country capital if city is completely unknown
  if (country) {
    const cIso = toIso2(country);
    const CAPITALS: Record<string, string> = {
      CZ: "Prague",
      AT: "Vienna",
      DE: "Berlin",
      FR: "Paris",
      IT: "Rome",
      ES: "Madrid",
      PT: "Lisbon",
      PL: "Warsaw",
      HU: "Budapest",
      BE: "Brussels",
      NL: "Amsterdam",
      SE: "Stockholm",
      FI: "Helsinki",
      DK: "Copenhagen",
      NO: "Oslo",
      IE: "Dublin",
      GR: "Athens",
      SI: "Ljubljana",
      HR: "Zagreb",
      EE: "Tallinn",
      LV: "Riga",
      LT: "Vilnius",
      TR: "Ankara",
      KR: "Seoul",
      CN: "Beijing",
      TW: "Taipei",
      LA: "Vientiane",
      BT: "Thimphu",
      JP: "Tokyo",
      SG: "Singapore",
      GE: "Tbilisi",
      AM: "Yerevan",
      AZ: "Baku",
      KZ: "Astana",
      UZ: "Tashkent",
    };
    if (CAPITALS[cIso]) return CAPITALS[cIso];
  }

  return "";
}

// Numbeo Country Name Normalizer
// Numbeo strictly requires specific Title Case English country spellings (Turkey, Czech Republic, Poland, France, etc.)
export function toNumbeoCountry(raw: string): string {
  if (!raw) return "";
  const trim = raw.trim();
  const low = trim.toLowerCase();
  if (NUMBEO_COUNTRY_MAP[low]) return NUMBEO_COUNTRY_MAP[low];

  const iso = toIso2(raw);
  if (NUMBEO_COUNTRY_MAP[iso.toLowerCase()]) return NUMBEO_COUNTRY_MAP[iso.toLowerCase()];

  const name = countryName(iso);
  if (name && NUMBEO_COUNTRY_MAP[name.toLowerCase()]) return NUMBEO_COUNTRY_MAP[name.toLowerCase()];

  if (name && name !== iso) return name;
  return trim.charAt(0).toUpperCase() + trim.slice(1).toLowerCase();
}

// Valid Numbeo Deep Link Generator
export function buildNumbeoCompareUrl(city: string, country: string): string {
  const c = toNumbeoCountry(country);
  const cleanCity = city?.trim();
  if (!cleanCity || cleanCity === "-" || cleanCity.length < 2) {
    return `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${encodeURIComponent(
      c,
    )}&displayCurrency=EUR`;
  }
  const mappedCity = NUMBEO_CITY_MAPPING[cleanCity.toLowerCase()] || cleanCity;
  return `https://www.numbeo.com/cost-of-living/compare_cities.jsp?country1=Slovakia&city1=Bratislava&country2=${encodeURIComponent(
    c,
  )}&city2=${encodeURIComponent(mappedCity)}`;
}

export function getBenchmarkLivingCost(city: string, country: string): LivingCostResult {
  const cName = toNumbeoCountry(country);
  const cityKey = (city || "").trim().toLowerCase();
  const mappedCity = NUMBEO_CITY_MAPPING[cityKey] || city;
  const countryKey = cName.trim().toLowerCase();
  const compareUrl = buildNumbeoCompareUrl(city, cName);
  const cityUrl = mappedCity
    ? `https://www.numbeo.com/cost-of-living/in/${encodeURIComponent(mappedCity)}?displayCurrency=EUR`
    : `https://www.numbeo.com/cost-of-living/country_result.jsp?country=${encodeURIComponent(cName)}&displayCurrency=EUR`;

  const benchmark =
    CITY_BENCHMARKS[cityKey] ||
    CITY_BENCHMARKS[mappedCity.toLowerCase()] ||
    COUNTRY_BENCHMARKS[countryKey];

  if (!benchmark) {
    return {
      city: city ? cleanCityMapping(city) : cName,
      country: cName,
      hasData: false,
      costOfLivingDiff: null,
      costOfLivingPlusRentDiff: null,
      rentDiff: null,
      restaurantDiff: null,
      groceriesDiff: null,
      singlePersonEstEur: null,
      compareUrl,
      cityUrl,
      source: "Numbeo",
    };
  }

  return {
    city: city ? cleanCityMapping(city) : cName,
    country: cName,
    hasData: true,
    costOfLivingDiff: benchmark.costOfLivingDiff,
    costOfLivingPlusRentDiff: Math.round((benchmark.costOfLivingDiff + benchmark.rentDiff) / 2),
    rentDiff: benchmark.rentDiff,
    restaurantDiff: benchmark.restaurantDiff,
    groceriesDiff: benchmark.groceriesDiff,
    singlePersonEstEur: benchmark.singlePersonEstEur,
    compareUrl,
    cityUrl,
    source: "Numbeo",
  };
}
