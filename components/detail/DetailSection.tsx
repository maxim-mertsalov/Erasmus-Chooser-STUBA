"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const COLLAPSED_STORAGE_KEY = "erasmus-collapsed-sections-v1";

export function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggle = (sectionKey: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [sectionKey]: !prev[sectionKey] };
      try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { collapsed, toggle };
}

export function Section({
  title,
  children,
  right,
  collapsed,
  onToggle,
  className,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  return (
    <section className={`border-t border-slate-100 px-4 py-3 dark:border-slate-800 ${className ?? ""}`}>
      <div
        className={`flex items-center justify-between ${onToggle ? "cursor-pointer select-none" : ""}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-1.5">
          {onToggle && (
            <span className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
              )}
            </span>
          )}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {title}
          </h3>
        </div>
        {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
      </div>
      {!collapsed && <div className="mt-2.5">{children}</div>}
    </section>
  );
}
