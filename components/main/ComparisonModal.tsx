"use client";
import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Coins,
  ExternalLink,
  GraduationCap,
  Languages,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import type { Agreement } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import type { StoreState } from "@/lib/store";
import type { MapPoint } from "@/components/MapView";
import { countryName, flag } from "@/lib/countries";
import { type GrantCategory, getGrantForCountry } from "@/lib/config/erasmusGrants";
import { Stars } from "@/components/ui";
import { extractCityForUni, useLivingCost } from "@/lib/services/livingCostService";

function LivingCostComparisonCell({
  geoLabel,
  code,
  name,
  country,
  userCostRating,
}: {
  geoLabel?: string;
  code?: string;
  name: string;
  country: string;
  userCostRating?: string;
}) {
  const city = React.useMemo(() => extractCityForUni(geoLabel, code, name, country), [geoLabel, code, name, country]);
  const cName = countryName(country);
  const { data, loading } = useLivingCost(city, cName);

  if (loading) {
    return <span className="text-xs text-slate-400">Loading…</span>;
  }

  if (data && data.hasData) {
    const isCheaper = (data.costOfLivingDiff ?? 0) < 0;
    return (
      <div className="flex flex-col gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-semibold ${
              isCheaper ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {data.costOfLivingDiff != null ? (data.costOfLivingDiff > 0 ? `+${data.costOfLivingDiff}%` : `${data.costOfLivingDiff}%`) : ""}
          </span>
          <span className="text-[11px] text-slate-500">vs Bratislava</span>
        </div>
        {data.rentDiff != null && (
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Rent:{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {data.rentDiff > 0 ? `+${data.rentDiff}%` : `${data.rentDiff}%`}
            </span>
          </div>
        )}
        <a
          href={data.compareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <span>Numbeo</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      {userCostRating ? (
        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">{userCostRating}</span>
      ) : (
        <span className="text-slate-400">—</span>
      )}
      {data?.compareUrl && (
        <a
          href={data.compareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400"
        >
          <span>Check on Numbeo</span>
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      )}
    </div>
  );
}

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-44 items-center justify-center text-xs text-slate-400">Loading map…</div>
  ),
});

export function ComparisonModal({
  isOpen,
  onClose,
  comparedKeys,
  onRemove,
  allAgreements,
  state,
  grantCategories,
  selectedFaculties,
  onOpenDetails,
}: {
  isOpen: boolean;
  onClose: () => void;
  comparedKeys: string[];
  onRemove: (uniKey: string) => void;
  allAgreements: Agreement[];
  state: StoreState;
  grantCategories: GrantCategory[];
  selectedFaculties?: string[];
  onOpenDetails: (uniKey: string) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || comparedKeys.length === 0) return null;

  // Build university summary objects for each compared key, filtering agreements to selected faculties
  const unis = comparedKeys.map((uniKey) => {
    const rawAgrs = allAgreements.filter((a) => a.uniKey === uniKey);
    const agrs = rawAgrs.filter((a) => {
      if (selectedFaculties && selectedFaculties.length > 0) {
        return selectedFaculties.includes(a.faculty);
      }
      return true;
    });
    const d = state.uni.get(uniKey) ?? {};
    const notes = state.notes.get(uniKey) ?? [];
    const links = state.links.get(uniKey) ?? [];
    const primary = agrs[0] ?? rawAgrs[0];
    const uniName = primary?.uniName || uniKey;
    const country = primary?.country || "";
    const uniCode = primary?.uniCode || "";
    const grant = getGrantForCountry(country, grantCategories);
    const maxPriority = Math.max(0, ...agrs.map((a) => state.row.get(a.id)?.priority ?? 0));
    const firstStatus = agrs.map((a) => state.row.get(a.id)?.status).find(Boolean) || "";

    // Map notes by category for quick row-matching
    const notesByCat = new Map<string, string[]>();
    notes.forEach((n) => {
      const list = notesByCat.get(n.category) ?? [];
      list.push(n.text);
      notesByCat.set(n.category, list);
    });

    return {
      uniKey,
      uniName,
      country,
      uniCode,
      data: d,
      agreements: agrs,
      notes,
      notesByCat,
      links,
      grant,
      maxPriority,
      status: firstStatus,
    };
  });

  // Calculate highest grant amount among compared for visual indicator
  const maxGrantAmount = Math.max(0, ...unis.map((u) => u.grant?.monthlyAmount ?? 0));

  // Find all distinct note categories present across the compared universities
  const distinctNoteCategories = Array.from(
    new Set(unis.flatMap((u) => u.notes.map((n) => n.category))),
  ).sort();

  // Prepare MapPoints for only the compared universities
  const mapPoints: MapPoint[] = unis
    .filter((u) => u.data.lat != null && u.data.lon != null)
    .map((u) => ({
      uniKey: u.uniKey,
      name: u.uniName,
      country: u.country,
      lat: u.data.lat!,
      lon: u.data.lon!,
      approx: u.data.geoSource === "unresolved",
      locStatus: u.data.geoSource === "exact" ? "exact" : u.data.geoSource === "auto" ? "auto" : "unresolved",
      priority: u.maxPriority,
      data: u.data,
      agreements: u.agreements,
      noteCount: u.notes.length,
    }));


  return (
    <div
      className="fixed inset-0 z-[2000] flex flex-col bg-slate-900/60 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mx-auto flex h-full w-full max-w-6xl flex-col bg-white shadow-2xl dark:bg-slate-950 sm:rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              University Comparison Matrix ({unis.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Map Preview of Compared Universities */}
        <div className="h-44 w-full shrink-0 border-b border-slate-200 dark:border-slate-800">
          {mapPoints.length > 0 ? (
            <MapView
              points={mapPoints}
              selected={null}
              flyKey={0}
              pickLabel={null}
              onSelectUni={onOpenDetails}
              onSelectRow={() => {}}
              onOpenDetails={onOpenDetails}
              onPick={() => {}}
              onCancelPick={() => {}}
              missingCount={unis.length - mapPoints.length}
              geoStatus={null}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              No coordinates available for selected universities yet.
            </div>
          )}
        </div>

        {/* Comparison Matrix Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="min-w-[650px] overflow-x-auto rounded-xl border border-slate-200 bg-white text-sm dark:border-slate-800 dark:bg-slate-900/60">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                  <th className="w-44 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Feature
                  </th>
                  {unis.map((u) => (
                    <th key={u.uniKey} className="px-3 py-3 text-left align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-slate-900 leading-tight dark:text-slate-100">{u.uniName}</div>
                          <div className="text-xs text-slate-400">{u.uniCode}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(u.uniKey)}
                          title="Remove from comparison"
                          className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
                {/* Country & City */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">Country & City</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <span>{flag(u.country)}</span>
                        <span>{countryName(u.country)}</span>
                      </div>
                      {u.data.city && (
                        <div className="mt-0.5 flex items-center gap-1 text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span>{u.data.city}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Erasmus Grant (Budget comparison) */}
                <tr className="bg-indigo-50/30 hover:bg-indigo-50/50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30">
                  <td className="px-3 py-2.5 font-medium text-indigo-900 dark:text-indigo-300">
                    <div className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Monthly Grant</span>
                    </div>
                  </td>
                  {unis.map((u) => {
                    const isTop = u.grant && maxGrantAmount > 0 && u.grant.monthlyAmount === maxGrantAmount;
                    return (
                      <td key={u.uniKey} className="px-3 py-2.5">
                        {u.grant ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 font-bold ${
                                isTop
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                                  : "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300"
                              }`}
                            >
                              ~{u.grant.monthlyAmount} €/mo
                              {isTop && <span className="text-[10px] font-normal">(highest)</span>}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">{u.grant.name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Cost of Living */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">Cost of living</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-2.5">
                      <LivingCostComparisonCell
                        geoLabel={u.data.geoLabel}
                        code={u.uniCode}
                        name={u.uniName}
                        country={u.country}
                        userCostRating={u.data.costOfLiving}
                      />
                    </td>
                  ))}
                </tr>

                {/* Language */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">Language</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-2.5">
                      {u.data.language ? (
                        <div className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <Languages className="h-3 w-3 text-slate-400" />
                          <span>{u.data.language}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Status & Priority */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">Priority & Status</td>
                  {unis.map((u) => {
                    const st = STATUSES.find((s) => s.value === u.status);
                    return (
                      <td key={u.uniKey} className="px-3 py-2.5">
                        <div className="flex flex-col gap-1">
                          <Stars value={u.maxPriority} disabled size="text-xs" />
                          {st && st.value ? (
                            <span className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold ${st.cls}`}>
                              {st.label}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">No status</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                {/* Agreements list */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">Agreements & Programs</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-2.5">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">
                        {u.agreements.length} agreement{u.agreements.length > 1 ? "s" : ""}
                      </div>
                      <ul className="mt-1 space-y-1 text-slate-500 dark:text-slate-400">
                        {u.agreements.map((a) => (
                          <li key={a.id} className="leading-tight">
                            • <b>{a.faculty}</b>: {a.program}
                            <span className="block text-[10px] text-slate-400">valid: {a.validTo}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                {/* Notes by Category (Alinged rows across universities!) */}
                {distinctNoteCategories.length > 0 && (
                  <tr className="bg-slate-100 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <td colSpan={unis.length + 1} className="px-3 py-1.5 text-xs uppercase tracking-wider">
                      📝 Notes by Category
                    </td>
                  </tr>
                )}

                {distinctNoteCategories.map((cat) => (
                  <tr key={cat} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-3 py-2.5 font-medium text-slate-600 dark:text-slate-400">
                      {cat}
                    </td>
                    {unis.map((u) => {
                      const catNotes = u.notesByCat.get(cat);
                      return (
                        <td key={u.uniKey} className="px-3 py-2.5">
                          {catNotes && catNotes.length > 0 ? (
                            <ul className="space-y-1">
                              {catNotes.map((txt, idx) => (
                                <li
                                  key={idx}
                                  className="rounded bg-indigo-50/50 p-1.5 text-slate-800 dark:bg-indigo-950/40 dark:text-slate-200 leading-snug"
                                >
                                  {txt}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Links */}
                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400">🔗 Links</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-2.5">
                      {u.links.length > 0 ? (
                        <ul className="space-y-1">
                          {u.links.map((link, idx) => (
                            <li key={idx}>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate max-w-xs">{link.label || link.url}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Actions Row */}
                <tr className="bg-slate-50 dark:bg-slate-900">
                  <td className="px-3 py-3 font-medium text-slate-500 dark:text-slate-400">Action</td>
                  {unis.map((u) => (
                    <td key={u.uniKey} className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenDetails(u.uniKey);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Open Details & Edit</span>
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
