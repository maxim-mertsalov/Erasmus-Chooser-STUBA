"use client";
import React, { useState } from "react";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import {
  type GrantCategory,
  resetGrantCategories,
  saveGrantCategories,
} from "@/lib/config/erasmusGrants";
import { flag } from "@/lib/countries";
import { b, inputCls, Modal } from "@/components/ui";

function CountryChipInput({
  countries,
  onAdd,
  onRemove,
}: {
  countries: string[];
  onAdd: (codes: string[]) => void;
  onRemove: (code: string) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  const handleCommit = (raw: string) => {
    const parts = raw
      .split(/[,;\s]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => Boolean(s) && /^[A-Z]{2}$/.test(s));

    if (parts.length > 0) {
      onAdd(parts);
    }
    setInputVal("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(",") || val.includes(";") || val.includes(" ")) {
      handleCommit(val);
    } else {
      setInputVal(val.toUpperCase());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCommit(inputVal);
    } else if (e.key === "Backspace" && !inputVal && countries.length > 0) {
      onRemove(countries[countries.length - 1]);
    }
  };

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white p-2 transition-colors focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900">
      {countries.map((cc) => (
        <span
          key={cc}
          className="inline-flex shrink-0 items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200/80 shadow-xs dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <span>{flag(cc)}</span>
          <span className="font-semibold">{cc}</span>
          <button
            type="button"
            onClick={() => onRemove(cc)}
            className="ml-0.5 rounded text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400"
            title={`Remove ${cc}`}
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        </span>
      ))}

      <input
        type="text"
        value={inputVal}
        maxLength={20}
        placeholder={countries.length === 0 ? "Type country ISO (e.g. DE, FR) or paste list…" : "+ add (e.g. DE)"}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => inputVal.trim() && handleCommit(inputVal)}
        className="min-w-28 flex-1 bg-transparent text-xs uppercase text-slate-800 placeholder:normal-case placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
      />
    </div>
  );
}

export function BudgetEditorModal({
  isOpen,
  onClose,
  categories,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  categories: GrantCategory[];
  onSave: (cats: GrantCategory[]) => void;
}) {
  const [list, setList] = useState<GrantCategory[]>(() => JSON.parse(JSON.stringify(categories)));

  if (!isOpen) return null;

  const updateCategory = (id: string, patch: Partial<GrantCategory>) => {
    setList((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)));
  };

  const removeCountry = (catId: string, countryCode: string) => {
    setList((prev) =>
      prev.map((cat) =>
        cat.id === catId ? { ...cat, countries: cat.countries.filter((c) => c !== countryCode) } : cat,
      ),
    );
  };

  const addCountries = (catId: string, countryCodes: string[]) => {
    const validCodes = countryCodes.map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (validCodes.length === 0) return;

    setList((prev) =>
      prev.map((cat) => {
        if (cat.id === catId) {
          const newCodes = validCodes.filter((c) => !cat.countries.includes(c));
          return { ...cat, countries: [...cat.countries, ...newCodes] };
        }
        // Remove added countries from other categories if present
        return { ...cat, countries: cat.countries.filter((c) => !validCodes.includes(c)) };
      }),
    );
  };

  const addCategory = () => {
    const newId = `group-${Date.now()}`;
    const newCat: GrantCategory = {
      id: newId,
      name: `Category ${list.length + 1}`,
      monthlyAmount: 500,
      countries: [],
    };
    setList((prev) => [...prev, newCat]);
  };

  const deleteCategory = (id: string) => {
    setList((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleReset = () => {
    if (confirm("Reset grant categories to default STU Bratislava rates?")) {
      const defs = resetGrantCategories();
      setList(JSON.parse(JSON.stringify(defs)));
      onSave(defs);
    }
  };

  const handleSave = () => {
    saveGrantCategories(list);
    onSave(list);
    onClose();
  };

  return (
    <Modal title="Erasmus+ Grants & Living Budgets" onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col gap-4 text-sm text-slate-800 dark:text-slate-200">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure monthly grant rates for country groups. You can edit amounts, reassign countries, delete groups,
          or create custom categories.
        </p>

        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {list.map((cat) => (
            <div
              key={cat.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2 dark:border-slate-800">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    className={`${inputCls} min-w-32 flex-1 font-semibold`}
                    value={cat.name}
                    placeholder="Category name"
                    onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                  />
                  <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      className={`${inputCls} w-20 shrink-0 text-right font-medium`}
                      value={cat.monthlyAmount}
                      onChange={(e) => updateCategory(cat.id, { monthlyAmount: Number(e.target.value) || 0 })}
                    />
                    <span className="select-none text-xs font-semibold text-slate-500 whitespace-nowrap dark:text-slate-400">
                      €/mo
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id)}
                  title="Delete category"
                  className="rounded p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Countries in this category */}
              <div className="mt-2.5">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>Countries ({cat.countries.length})</span>
                  <span className="text-[11px] text-slate-400">Type 2-letter ISO or paste comma-separated</span>
                </div>
                <CountryChipInput
                  countries={cat.countries}
                  onAdd={(codes) => addCountries(cat.id, codes)}
                  onRemove={(code) => removeCountry(cat.id, code)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addCategory}
              className={b("secondary", "py-1 text-xs")}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Category</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className={b("ghost", "py-1 text-xs text-slate-500")}
              title="Reset to default STU rates"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset STU Defaults</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={b("ghost", "py-1 text-xs")}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} className={b("primary", "py-1 text-xs")}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
