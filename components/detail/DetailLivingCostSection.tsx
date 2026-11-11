"use client";
import React, { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore } from "@/lib/store";
import type { UniData } from "@/lib/types";
import type { GrantCategory } from "@/lib/config/erasmusGrants";
import { countryName } from "@/lib/countries";
import { extractCityForUni, useLivingCost, buildNumbeoCompareUrl } from "@/lib/services/livingCostService";
import { LivingCostWidget } from "../main/LivingCostWidget";
import { Section } from "./DetailSection";

export function DetailLivingCostSection({
  uni,
  data,
  store,
  grant,
  isFullscreen = false,
  readOnly = false,
  collapsed,
  onToggle,
  borderTop = true,
}: {
  uni: UniGroup;
  data: UniData;
  store: RecordStore;
  grant: GrantCategory | null;
  isFullscreen?: boolean;
  readOnly?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
}) {
  const autoCity = useMemo(
    () => extractCityForUni(data.geoLabel, uni.code, uni.name, uni.country),
    [data.geoLabel, uni.code, uni.name, uni.country],
  );
  const autoCountry = countryName(uni.country);

  const effectiveCity = data.city?.trim() || autoCity;
  const effectiveCountry = data.country?.trim() || autoCountry;

  const { data: livingCost, loading: costLoading } = useLivingCost(effectiveCity, effectiveCountry);
  const numbeoCompareUrl = livingCost?.compareUrl || buildNumbeoCompareUrl(effectiveCity, effectiveCountry);

  const handleSaveLocation = (city: string, country: string) => {
    store.setUni(uni.uniKey, {
      city: city || undefined,
      country: country || undefined,
    });
  };

  const handleResetLocation = () => {
    store.setUni(uni.uniKey, {
      city: "",
      country: "",
    });
  };

  return (
    <Section
      title="Cost of Living vs Bratislava"
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
      right={
        <a
          href={numbeoCompareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          title="Open Numbeo comparison"
        >
          <span>Numbeo</span>
          <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
        </a>
      }
    >
      <LivingCostWidget
        cost={livingCost}
        loading={costLoading}
        grant={grant}
        compact={!isFullscreen}
        customCity={data.city}
        customCountry={data.country}
        autoCity={autoCity}
        autoCountry={autoCountry}
        onSaveLocation={handleSaveLocation}
        onResetLocation={handleResetLocation}
        readOnly={readOnly}
      />
    </Section>
  );
}
