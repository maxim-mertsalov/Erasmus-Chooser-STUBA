"use client";
import React from "react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore } from "@/lib/store";
import type { UniData } from "@/lib/types";
import { CommitInput, inputCls } from "../ui";
import { Section } from "./DetailSection";
import { DetailTagsEditor } from "./DetailTagsEditor";

const COMMON_LANGUAGES = [
  "English",
  "German",
  "French",
  "Spanish",
  "Italian",
  "Portuguese",
  "Czech",
  "Polish",
  "Slovak",
  "Turkish",
  "Dutch",
];

export function DetailInfoSection({
  uni,
  data,
  store,
  readOnly = false,
  collapsed,
  onToggle,
  borderTop = true,
}: {
  uni: UniGroup;
  data: UniData;
  store: RecordStore;
  readOnly?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
}) {
  return (
    <Section
      title="University info"
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="grid grid-cols-[90px_1fr] items-center gap-2.5 text-sm">
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Language</span>
        <CommitInput
          value={data.language ?? ""}
          disabled={readOnly}
          list="lang-list"
          placeholder="e.g. English, German B2"
          onCommit={(v) => store.setUni(uni.uniKey, { language: v })}
        />
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Cost of living</span>
        <select
          className={inputCls}
          disabled={readOnly}
          value={data.costOfLiving ?? ""}
          onChange={(e) => store.setUni(uni.uniKey, { costOfLiving: e.target.value as "" })}
        >
          <option value="">—</option>
          <option value="low">€ Low</option>
          <option value="medium">€€ Medium</option>
          <option value="high">€€€ High</option>
        </select>
        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Tags</span>
        <DetailTagsEditor
          value={data.tags ?? ""}
          disabled={readOnly}
          onChange={(v) => store.setUni(uni.uniKey, { tags: v })}
        />
      </div>
      <datalist id="lang-list">
        {COMMON_LANGUAGES.map((l) => (
          <option key={l} value={l} />
        ))}
      </datalist>
    </Section>
  );
}
