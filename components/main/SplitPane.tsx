"use client";
import React, { useEffect, useRef, useState } from "react";

export function SplitPane({
  showLeft,
  showRight,
  leftContent,
  rightContent,
  initialPct = 50,
}: {
  showLeft: boolean;
  showRight: boolean;
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  initialPct?: number;
}) {
  const [splitPct, setSplitPct] = useState(initialPct);
  const [dragging, setDragging] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const rect = splitRef.current?.getBoundingClientRect();
      if (!rect || !rect.width) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(80, Math.max(20, pct)));
    };
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging]);

  return (
    <div
      ref={splitRef}
      className={`flex min-h-0 flex-1 ${dragging ? "cursor-col-resize select-none" : ""}`}
    >
      {showLeft && (
        <div
          style={showRight ? { width: `${splitPct}%` } : undefined}
          className={`relative flex min-w-0 flex-col bg-white dark:bg-slate-950 ${
            showRight ? "shrink-0" : "flex-1"
          } ${dragging ? "pointer-events-none" : ""}`}
        >
          {leftContent}
        </div>
      )}

      {showLeft && showRight && (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Drag to resize (double-click to reset 50/50)"
          onPointerDown={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDoubleClick={() => setSplitPct(50)}
          className={`group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center transition-colors ${
            dragging
              ? "bg-indigo-500"
              : "bg-slate-200 hover:bg-indigo-400 dark:bg-slate-800 dark:hover:bg-indigo-500"
          }`}
        >
          <div className="h-8 w-0.5 rounded-full bg-slate-400 group-hover:bg-white dark:bg-slate-600" />
        </div>
      )}

      {showRight && (
        <div className={`relative min-w-0 flex-1 ${dragging ? "pointer-events-none" : ""}`}>
          {rightContent}
        </div>
      )}
    </div>
  );
}
