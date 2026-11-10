"use client";
// Small reusable UI pieces (Tailwind only).
import { useEffect, useRef, useState, type ReactNode } from "react";

export const btn = {
  base: "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed",
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "text-rose-600 hover:bg-rose-50",
};
export const b = (kind: keyof typeof btn = "secondary", extra = "") => `${btn.base} ${btn[kind]} ${extra}`;

export const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

/** Text input that keeps local state while typing and commits on blur / Enter. */
export function CommitInput({
  value,
  onCommit,
  placeholder,
  disabled,
  className = inputCls,
  list,
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  list?: string;
}) {
  const [v, setV] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setV(value);
  }, [value]);
  const commit = () => {
    if (v !== value) onCommit(v.trim());
  };
  return (
    <input
      className={className}
      value={v}
      list={list}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function Stars({
  value,
  onChange,
  disabled,
  size = "text-base",
}: {
  value: number;
  onChange?: (v: number) => void;
  disabled?: boolean;
  size?: string;
}) {
  return (
    <span className={`inline-flex ${size} leading-none`} onClick={(e) => e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled || !onChange}
          title={`Priority ${i}`}
          className={`${i <= value ? "text-amber-400" : "text-slate-300"} ${onChange && !disabled ? "hover:scale-125" : ""} transition`}
          onClick={() => onChange?.(i === value ? 0 : i)}
        >
          ★
        </button>
      ))}
    </span>
  );
}

/** Dropdown with checkboxes. */
export function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: ReactNode; count?: number }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <details ref={ref} className="relative">
      <summary
        className={`${b("secondary", "cursor-pointer list-none py-1")} ${selected.length ? "border-indigo-400 bg-indigo-50 text-indigo-700" : ""}`}
      >
        {label}
        {selected.length > 0 && <span className="rounded bg-indigo-600 px-1.5 text-xs text-white">{selected.length}</span>}
        <span className="text-xs">▾</span>
      </summary>
      <div className="absolute z-[1000] mt-1 max-h-80 w-64 overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
        {selected.length > 0 && (
          <button className="w-full rounded px-2 py-1 text-left text-xs text-indigo-600 hover:bg-slate-50" onClick={() => onChange([])}>
            Clear selection
          </button>
        )}
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
            <span className="flex-1 truncate">{o.label}</span>
            {o.count != null && <span className="text-xs text-slate-400">{o.count}</span>}
          </label>
        ))}
        {!options.length && <div className="px-2 py-1 text-sm text-slate-400">No options</div>}
      </div>
    </details>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

export const GITHUB_URL = "https://github.com/maxim-mertsalov/Erasmus-Chooser-STUBA";

export function GitHubIcon({ className = "h-4 w-4 shrink-0" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}
