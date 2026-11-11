"use client";
import React, { useState, useMemo } from "react";
import { ChevronsUpDown, X } from "lucide-react";

export function DetailTagsEditor({
  value,
  onChange,
  disabled,
  placeholder = "Add tag (type comma or enter)…",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const tags = useMemo(() => {
    return (value || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }, [value]);

  const addTag = (text: string) => {
    const clean = text.trim().replace(/^[,\s]+|[,\s]+$/g, "");
    if (!clean) return;
    if (!tags.includes(clean)) {
      const next = [...tags, clean];
      onChange(next.join(", "));
    }
    setInputValue("");
  };

  const removeTag = (index: number) => {
    const next = tags.filter((_, i) => i !== index);
    onChange(next.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes(",")) {
      const parts = val.split(",");
      for (const p of parts.slice(0, -1)) {
        addTag(p);
      }
      setInputValue(parts[parts.length - 1].trimStart());
    } else {
      setInputValue(val);
    }
  };

  return (
    <div className="relative min-w-0">
      <div
        className={`flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1 transition-colors focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 items-center gap-1.5 ${
            isExpanded ? "flex-wrap max-h-32 overflow-y-auto" : "overflow-x-auto whitespace-nowrap scrollbar-none"
          }`}
        >
          {tags.map((tag, idx) => (
            <span
              key={`${tag}-${idx}`}
              className="inline-flex shrink-0 items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-900/60"
            >
              <span>{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(idx)}
                  className="rounded text-indigo-400 hover:text-rose-600 dark:hover:text-rose-400"
                  title="Remove tag"
                >
                  <X className="h-3 w-3" strokeWidth={2} />
                </button>
              )}
            </span>
          ))}

          {!disabled && (
            <input
              type="text"
              value={inputValue}
              disabled={disabled}
              placeholder={tags.length === 0 ? placeholder : "+ tag"}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onBlur={() => inputValue.trim() && addTag(inputValue)}
              className="min-w-16 flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-200"
            />
          )}
        </div>

        {tags.length > 2 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0 p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title={isExpanded ? "Collapse tags to single row" : "Expand tags to multi-line"}
          >
            <ChevronsUpDown className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        )}
      </div>
    </div>
  );
}
