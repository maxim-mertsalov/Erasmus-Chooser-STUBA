"use client";
import React, { useState } from "react";
import type { UniGroup } from "../DetailPanel";
import type { RecordStore, NoteItem } from "@/lib/store";
import { NOTE_CATEGORIES } from "@/lib/types";
import { b, inputCls } from "../ui";
import { Section } from "./DetailSection";

export function DetailNotesSection({
  uni,
  notes,
  store,
  readOnly = false,
  collapsed,
  onToggle,
  borderTop = true,
}: {
  uni: UniGroup;
  notes: NoteItem[];
  store: RecordStore;
  readOnly?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  borderTop?: boolean;
}) {
  const [noteCat, setNoteCat] = useState(NOTE_CATEGORIES[0]);
  const [noteText, setNoteText] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const notesByCat = new Map<string, NoteItem[]>();
  notes.forEach((n) =>
    (notesByCat.get(n.category) ?? notesByCat.set(n.category, []).get(n.category)!).push(n),
  );

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    store.addNote(uni.uniKey, noteCat.trim() || "Other", noteText.trim());
    setNoteText("");
  };

  return (
    <Section
      title={`Notes (${notes.length})`}
      className={borderTop ? undefined : "border-t-0"}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-3">
        {[...notesByCat.entries()].map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-1 text-xs font-semibold text-indigo-700 dark:text-indigo-400">{cat}</div>
            <div className="flex flex-col gap-1.5">
              {items.map((n) => (
                <div key={n.key} className="group rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-800">
                  {editingNote === n.key ? (
                    <textarea
                      autoFocus
                      className={`${inputCls} min-h-20`}
                      defaultValue={n.text}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingNote(null);
                      }}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== n.text) store.updateNote(n.key, { text: v });
                        setEditingNote(null);
                      }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{n.text}</div>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span className="truncate">
                      {n.author} {n.createdAt && `· ${new Date(n.createdAt).toLocaleDateString()}`}
                    </span>
                    {!readOnly && (
                      <span className="ml-auto hidden gap-2 group-hover:flex">
                        <button className="hover:text-slate-700" onClick={() => setEditingNote(n.key)}>
                          Edit
                        </button>
                        <button
                          className="hover:text-rose-600"
                          onClick={() => confirm("Delete this note?") && store.deleteNote(n.key)}
                        >
                          Delete
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!readOnly && (
        <form className="mt-3 flex flex-col gap-2" onSubmit={handleAddNote}>
          <input
            className={inputCls}
            list="note-cats"
            value={noteCat}
            onChange={(e) => setNoteCat(e.target.value)}
            placeholder="Category"
          />
          <datalist id="note-cats">
            {NOTE_CATEGORIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <textarea
            className={`${inputCls} min-h-16`}
            placeholder="Write a note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
          />
          <button className={b("primary", "self-end text-xs")} disabled={!noteText.trim()}>
            Add note
          </button>
        </form>
      )}
    </Section>
  );
}
