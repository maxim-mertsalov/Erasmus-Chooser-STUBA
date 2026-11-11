"use client";
import React, { useState } from "react";
import {
  ArrowUpRight,
  DollarSign,
  Home,
  Pencil,
  ShoppingBag,
  Utensils,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { LivingCostResult } from "@/lib/services/livingCostService";
import type { GrantCategory } from "@/lib/config/erasmusGrants";

export interface LivingCostWidgetProps {
  cost: LivingCostResult | null;
  loading?: boolean;
  grant?: GrantCategory | null;
  compact?: boolean;
  customCity?: string;
  customCountry?: string;
  autoCity?: string;
  autoCountry?: string;
  onSaveLocation?: (city: string, country: string) => void;
  onResetLocation?: () => void;
  readOnly?: boolean;
}

function DiffBadge({ diff, label }: { diff: number | null; label: string }) {
  if (diff === null) return null;
  const isCheaper = diff < 0;
  const abs = Math.abs(diff);

  return (
    <div className="flex items-center justify-between py-1 text-xs">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-semibold ${
          isCheaper
            ? "text-emerald-600 dark:text-emerald-400"
            : diff === 0
              ? "text-slate-500"
              : "text-amber-600 dark:text-amber-400"
        }`}
      >
        {isCheaper ? (
          <>
            <TrendingDown className="h-3 w-3" />
            <span>-{abs}% vs Bratislava</span>
          </>
        ) : diff > 0 ? (
          <>
            <TrendingUp className="h-3 w-3" />
            <span>+{abs}% vs Bratislava</span>
          </>
        ) : (
          <span>Same as Bratislava</span>
        )}
      </span>
    </div>
  );
}

function DiffBar({ diff, label, icon: Icon }: { diff: number | null; label: string; icon: React.ElementType }) {
  if (diff === null) return null;
  const isCheaper = diff < 0;
  const abs = Math.min(Math.abs(diff), 100);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <Icon className="h-3.5 w-3.5 text-slate-400" />
          <span>{label}</span>
        </span>
        <span
          className={`font-semibold ${
            isCheaper
              ? "text-emerald-600 dark:text-emerald-400"
              : diff === 0
                ? "text-slate-500"
                : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {diff > 0 ? `+${diff}%` : `${diff}%`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 flex">
        {isCheaper ? (
          <>
            <div className="flex-1 bg-transparent" />
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${abs}%` }}
            />
          </>
        ) : (
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-500"
            style={{ width: `${abs}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function LivingCostWidget({
  cost,
  loading,
  grant,
  compact = false,
  customCity,
  customCountry,
  autoCity,
  autoCountry,
  onSaveLocation,
  onResetLocation,
  readOnly = false,
}: LivingCostWidgetProps) {
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editCity, setEditCity] = useState("");
  const [editCountry, setEditCountry] = useState("");

  const handleOpenEdit = () => {
    setEditCity(customCity ?? (cost?.city || autoCity || ""));
    setEditCountry(customCountry ?? (cost?.country || autoCountry || ""));
    setIsEditingLocation(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveLocation) {
      onSaveLocation(editCity.trim(), editCountry.trim());
    }
    setIsEditingLocation(false);
  };

  if (loading && !cost) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-400 animate-pulse dark:border-slate-800 dark:bg-slate-900/60">
        Loading cost of living comparison with Bratislava…
      </div>
    );
  }

  if (!cost) return null;

  const isCustomized = Boolean(customCity || customCountry);
  const locationLabel = cost.city ? `${cost.city}, ${cost.country}` : cost.country;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="font-semibold text-xs text-slate-900 uppercase tracking-wider dark:text-slate-100">
              Cost of Living vs Bratislava
            </h4>
            {isCustomized && (
              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                Custom
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>{locationLabel} · via Numbeo</span>
            {!readOnly && onSaveLocation && !isEditingLocation && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="inline-flex items-center gap-0.5 text-indigo-600 hover:underline dark:text-indigo-400"
                title="Change city or country for Numbeo"
              >
                <Pencil className="h-2.5 w-2.5" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
        <a
          href={cost.compareUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900 shrink-0"
          title="Open complete item-by-item comparison on Numbeo"
        >
          <span>Compare on Numbeo</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Optional inline location override editor */}
      {isEditingLocation && !readOnly && (
        <form
          onSubmit={handleFormSubmit}
          className="flex flex-col gap-2 rounded-lg border border-indigo-200 bg-indigo-50/40 p-2.5 dark:border-indigo-900/60 dark:bg-indigo-950/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Override Numbeo Location
            </span>
            <span className="text-[11px] text-slate-400">
              Auto: {autoCity ? `${autoCity}, ${autoCountry}` : autoCountry || "—"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium uppercase text-slate-500 mb-0.5">City</label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder={autoCity || "e.g. Seoul, Prague, Lyon"}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase text-slate-500 mb-0.5">Country</label>
              <input
                type="text"
                value={editCountry}
                onChange={(e) => setEditCountry(e.target.value)}
                placeholder={autoCountry || "e.g. South Korea, France"}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            {isCustomized ? (
              <button
                type="button"
                onClick={() => {
                  onResetLocation?.();
                  setIsEditingLocation(false);
                }}
                className="text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
              >
                Reset to auto
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="rounded px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        </form>
      )}

      {cost.hasData ? (
        <div className="flex flex-col gap-2.5">
          {/* Main comparison highlights */}
          {compact ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              <DiffBadge diff={cost.costOfLivingDiff} label="General Cost of Living" />
              <DiffBadge diff={cost.rentDiff} label="Rent & Housing" />
              <DiffBadge diff={cost.restaurantDiff} label="Dining & Cafes" />
              <DiffBadge diff={cost.groceriesDiff} label="Groceries" />
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <DiffBar diff={cost.costOfLivingDiff} label="Cost of Living" icon={DollarSign} />
              <DiffBar diff={cost.rentDiff} label="Rent Prices" icon={Home} />
              <DiffBar diff={cost.restaurantDiff} label="Restaurants" icon={Utensils} />
              <DiffBar diff={cost.groceriesDiff} label="Groceries" icon={ShoppingBag} />
            </div>
          )}

          {/* Monthly Estimate & Erasmus Grant coverage */}
          {cost.singlePersonEstEur && (
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              <span>
                Est. monthly single living: <b>~{cost.singlePersonEstEur} €</b> (excl. rent)
              </span>
              {grant && (
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  Grant ({grant.monthlyAmount} €) covers ~
                  {Math.round((grant.monthlyAmount / cost.singlePersonEstEur) * 100)}%
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">
            No cost of living data available
          </p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Numbeo does not currently have verified benchmark indices for {locationLabel}.
            You can check community prices or compare directly on Numbeo using the button above, or click Edit above to specify a nearby city.
          </p>
        </div>
      )}
    </div>
  );
}
