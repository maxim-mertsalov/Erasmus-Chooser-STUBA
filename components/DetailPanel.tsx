"use client";
import React, { useState } from "react";
import { Coins, ExternalLink, Maximize2, Minimize2, X } from "lucide-react";
import { countryName, flag } from "@/lib/countries";
import { getGrantForCountry, loadGrantCategories } from "@/lib/config/erasmusGrants";
import { buildNumbeoCompareUrl, extractCityForUni } from "@/lib/services/livingCostService";
import type { RecordStore, StoreState } from "@/lib/store";
import type { Agreement } from "@/lib/types";
import { b } from "./ui";
import { useCollapsedSections } from "./detail/DetailSection";
import { DetailAgreementsSection } from "./detail/DetailAgreementsSection";
import { DetailInfoSection } from "./detail/DetailInfoSection";
import { DetailLocationSection } from "./detail/DetailLocationSection";
import { DetailLivingCostSection } from "./detail/DetailLivingCostSection";
import { DetailLinksSection } from "./detail/DetailLinksSection";
import { DetailNotesSection } from "./detail/DetailNotesSection";

export interface UniGroup {
  uniKey: string;
  name: string;
  country: string;
  code: string;
  agreements: Agreement[];
}

export function DetailPanel({
  uni,
  state,
  store,
  onClose,
  onStartPick,
  onSelectRow,
  selectedRow,
  isFullscreen = false,
  onToggleFullscreen,
  isMobile = false,
}: {
  uni: UniGroup;
  state: StoreState;
  store: RecordStore;
  onClose: () => void;
  onStartPick: () => void;
  onSelectRow: (id: string) => void;
  selectedRow: string | null;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  isMobile?: boolean;
}) {
  const ro = state.readOnly;
  const data = state.uni.get(uni.uniKey) ?? {};
  const notes = state.notes.get(uni.uniKey) ?? [];
  const links = state.links.get(uni.uniKey) ?? [];
  const [now] = useState(() => Date.now());

  const { collapsed, toggle } = useCollapsedSections();

  const grant = getGrantForCountry(uni.country, loadGrantCategories());

  // Effective location for top-bar Numbeo compare link
  const city = data.city?.trim() || extractCityForUni(data.geoLabel, uni.code, uni.name, uni.country);
  const targetCountry = data.country?.trim() || countryName(uni.country);
  const topNumbeoCompareUrl = buildNumbeoCompareUrl(city, targetCountry);

  const renderAgreements = (borderTop = true) => (
    <DetailAgreementsSection
      uni={uni}
      state={state}
      store={store}
      selectedRow={selectedRow}
      onSelectRow={onSelectRow}
      collapsed={!isFullscreen && !!collapsed["agreements"]}
      onToggle={isFullscreen ? undefined : () => toggle("agreements")}
      borderTop={borderTop}
      now={now}
    />
  );

  const renderInfo = (borderTop = true) => (
    <DetailInfoSection
      uni={uni}
      data={data}
      store={store}
      readOnly={ro}
      collapsed={!isFullscreen && !!collapsed["info"]}
      onToggle={isFullscreen ? undefined : () => toggle("info")}
      borderTop={borderTop}
    />
  );

  const renderLocation = (borderTop = true) => (
    <DetailLocationSection
      uni={uni}
      data={data}
      store={store}
      onStartPick={onStartPick}
      readOnly={ro}
      collapsed={!isFullscreen && !!collapsed["location"]}
      onToggle={isFullscreen ? undefined : () => toggle("location")}
      borderTop={borderTop}
    />
  );

  const renderLivingCost = (borderTop = true) => (
    <DetailLivingCostSection
      uni={uni}
      data={data}
      store={store}
      grant={grant}
      isFullscreen={isFullscreen}
      readOnly={ro}
      collapsed={!isFullscreen && !!collapsed["living_cost"]}
      onToggle={isFullscreen ? undefined : () => toggle("living_cost")}
      borderTop={borderTop}
    />
  );

  const renderLinks = (borderTop = true) => (
    <DetailLinksSection
      uni={uni}
      links={links}
      store={store}
      readOnly={ro}
      collapsed={!isFullscreen && !!collapsed["links"]}
      onToggle={isFullscreen ? undefined : () => toggle("links")}
      borderTop={borderTop}
    />
  );

  const renderNotes = (borderTop = true) => (
    <DetailNotesSection
      uni={uni}
      notes={notes}
      store={store}
      readOnly={ro}
      collapsed={!isFullscreen && !!collapsed["notes"]}
      onToggle={isFullscreen ? undefined : () => toggle("notes")}
      borderTop={borderTop}
    />
  );

  return (
    <aside
      className={`flex h-full flex-col overflow-hidden bg-white text-slate-900 shadow-xl dark:bg-slate-900 dark:text-slate-100 ${
        isFullscreen ? "rounded-2xl" : "border-l border-slate-200 dark:border-slate-800"
      }`}
    >
      <header className="flex items-start gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight text-slate-900 dark:text-slate-100 text-base sm:text-lg">
            {uni.name}
          </h2>
          <div className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {flag(uni.country)} {countryName(uni.country)} {uni.code && <>· <code>{uni.code}</code></>}
          </div>
          {grant && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50/70 px-2 py-0.5 text-xs text-indigo-800 dark:border-indigo-900/60 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Coins className="h-3 w-3 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>
                  Erasmus Grant: <b>~{grant.monthlyAmount} €/mo</b> ({grant.name})
                </span>
              </div>
              <a
                href={topNumbeoCompareUrl}
                target="_blank"
                rel="noreferrer"
                title="Compare cost of living with Bratislava on Numbeo"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                <span>Compare prices with Bratislava</span>
                <ExternalLink className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              </a>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isMobile && onToggleFullscreen && (
            <button
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          )}
          <button className={b("ghost", "px-2")} onClick={onClose} title="Close">
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      <div className={`flex-1 overflow-y-auto ${isFullscreen ? "p-4 sm:p-5" : ""}`}>
        {isFullscreen ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Left Column: Agreements, Info, Location, Links */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderAgreements(false)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderInfo(false)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderLocation(false)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderLinks(false)}
              </div>
            </div>

            {/* Right Column: Living Cost Widget, Notes */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderLivingCost(false)}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900/60">
                {renderNotes(false)}
              </div>
            </div>
          </div>
        ) : (
          <>
            {renderAgreements(true)}
            {renderInfo(true)}
            {renderLocation(true)}
            {renderLivingCost(true)}
            {renderLinks(true)}
            {renderNotes(true)}
          </>
        )}
      </div>
    </aside>
  );
}
