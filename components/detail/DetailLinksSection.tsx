"use client";
import React, { useState } from "react";
import { Link2, X } from "lucide-react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore, LinkItem } from "@/lib/store";
import { b, inputCls } from "../ui";
import { Section } from "./DetailSection";

export function DetailLinksSection({
  uni,
  links,
  store,
  readOnly = false,
  collapsed,
  onToggle,
  borderTop = true,
}: {
  uni: UniGroup;
  links: LinkItem[];
  store: RecordStore;
  readOnly?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
}) {
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const url = /^https?:\/\//.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    store.addLink(uni.uniKey, linkLabel.trim(), url);
    setLinkLabel("");
    setLinkUrl("");
  };

  return (
    <Section
      title={`Links (${links.length})`}
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <ul className="flex flex-col gap-1 text-sm">
        {links.map((l) => (
          <li key={l.key} className="flex items-center gap-2">
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-indigo-600 hover:underline"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{l.label || l.url}</span>
            </a>
            {!readOnly && (
              <button
                className="inline-flex items-center text-slate-400 hover:text-rose-600"
                onClick={() => store.deleteLink(l.key)}
                title="Delete"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!readOnly && (
        <form className="mt-2 flex gap-2" onSubmit={handleAddLink}>
          <input
            className={`${inputCls} w-1/3`}
            placeholder="Label"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />
          <button className={b("secondary", "text-xs")} disabled={!linkUrl.trim()}>
            Add
          </button>
        </form>
      )}
    </Section>
  );
}
