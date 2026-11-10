"use client";
import { useState } from "react";
import { countryName, flag } from "@/lib/countries";
import { autoLocate, geocode, type GeoHit } from "@/lib/geocode";
import type { RecordStore, StoreState } from "@/lib/store";
import { NOTE_CATEGORIES, STATUSES, type Agreement, type RowStatus } from "@/lib/types";
import { b, CommitInput, inputCls, Spinner, Stars } from "./ui";

export interface UniGroup {
  uniKey: string;
  name: string;
  country: string;
  code: string;
  agreements: Agreement[];
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="border-t border-slate-100 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function DetailPanel({
  uni,
  state,
  store,
  onClose,
  onStartPick,
  onSelectRow,
  selectedRow,
}: {
  uni: UniGroup;
  state: StoreState;
  store: RecordStore;
  onClose: () => void;
  onStartPick: () => void;
  onSelectRow: (id: string) => void;
  selectedRow: string | null;
}) {
  const ro = state.readOnly;
  const data = state.uni.get(uni.uniKey) ?? {};
  const notes = state.notes.get(uni.uniKey) ?? [];
  const links = state.links.get(uni.uniKey) ?? [];
  const [now] = useState(() => Date.now());

  const [noteCat, setNoteCat] = useState(NOTE_CATEGORIES[0]);
  const [noteText, setNoteText] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [geoQuery, setGeoQuery] = useState("");
  const [geoHits, setGeoHits] = useState<GeoHit[] | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [coords, setCoords] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const runAuto = async () => {
    setGeoBusy(true);
    setGeoMsg("");
    try {
      const r = await autoLocate(uni.name, uni.country, uni.code);
      if (r) store.setUni(uni.uniKey, { lat: r.lat, lon: r.lon, geoSource: r.source, geoLabel: r.label });
      else {
        store.setUni(uni.uniKey, { geoSource: "failed" });
        setGeoMsg("Nothing found. Try searching or pick on the map.");
      }
    } catch (e) {
      setGeoMsg((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  };

  const runSearch = async () => {
    if (!geoQuery.trim()) return;
    setGeoBusy(true);
    try {
      const [n, p] = await Promise.all([
        geocode(geoQuery, {}),
        geocode(geoQuery, { provider: "photon" }),
      ]);
      setGeoHits([...n, ...p].slice(0, 8));
    } catch (e) {
      setGeoMsg((e as Error).message);
    } finally {
      setGeoBusy(false);
    }
  };

  const applyCoords = () => {
    const m = coords.match(/(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
    if (!m) return setGeoMsg("Use the format: 48.1486, 17.1077");
    store.setUni(uni.uniKey, { lat: +m[1], lon: +m[2], geoSource: "manual", geoLabel: "Manual coordinates" });
    setCoords("");
  };

  const notesByCat = new Map<string, typeof notes>();
  notes.forEach((n) => (notesByCat.get(n.category) ?? notesByCat.set(n.category, []).get(n.category)!).push(n));

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-xl">
      <header className="flex items-start gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold leading-tight">{uni.name}</h2>
          <div className="mt-0.5 text-sm text-slate-500">
            {flag(uni.country)} {countryName(uni.country)} {uni.code && <>· <code>{uni.code}</code></>}
          </div>
        </div>
        <button className={b("ghost", "px-2")} onClick={onClose} title="Close">
          ✕
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Section title={`Agreements (${uni.agreements.length})`}>
          <div className="flex flex-col gap-1.5">
            {uni.agreements.map((a) => {
              const rd = state.row.get(a.id) ?? {};
              const expired = a.validToTs != null && a.validToTs < now;
              return (
                <div
                  key={a.id}
                  onClick={() => onSelectRow(a.id)}
                  className={`cursor-pointer rounded-md border p-2 text-sm ${selectedRow === a.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200"} ${rd.hidden ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <b>{a.faculty}</b> · {a.program}
                    </span>
                    <Stars value={rd.priority ?? 0} disabled={ro} onChange={(v) => store.setRow(a.id, { priority: v })} size="text-sm" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span className={expired ? "text-rose-600" : ""}>
                      {a.validFrom || "?"} → {a.validTo || "?"}
                    </span>
                    {!a.active && <span className="rounded bg-slate-200 px-1">inactive</span>}
                    <select
                      className="ml-auto rounded border border-slate-200 px-1 py-0.5"
                      value={rd.status ?? ""}
                      disabled={ro}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => store.setRow(a.id, { status: e.target.value as RowStatus })}
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="hover:text-slate-800"
                      disabled={ro}
                      title={rd.hidden ? "Show" : "Hide"}
                      onClick={(e) => {
                        e.stopPropagation();
                        store.setRow(a.id, { hidden: !rd.hidden });
                      }}
                    >
                      {rd.hidden ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="University info">
          <div className="grid grid-cols-[100px_1fr] items-center gap-2 text-sm">
            <span className="text-slate-500">Language</span>
            <CommitInput
              value={data.language ?? ""}
              disabled={ro}
              list="lang-list"
              placeholder="e.g. English, German B2"
              onCommit={(v) => store.setUni(uni.uniKey, { language: v })}
            />
            <span className="text-slate-500">City</span>
            <CommitInput value={data.city ?? ""} disabled={ro} onCommit={(v) => store.setUni(uni.uniKey, { city: v })} />
            <span className="text-slate-500">Cost of living</span>
            <select
              className={inputCls}
              disabled={ro}
              value={data.costOfLiving ?? ""}
              onChange={(e) => store.setUni(uni.uniKey, { costOfLiving: e.target.value as "" })}
            >
              <option value="">—</option>
              <option value="low">💶 Low</option>
              <option value="medium">💶💶 Medium</option>
              <option value="high">💶💶💶 High</option>
            </select>
            <span className="text-slate-500">Tags</span>
            <CommitInput
              value={data.tags ?? ""}
              disabled={ro}
              placeholder="comma separated, e.g. sea, big city"
              onCommit={(v) => store.setUni(uni.uniKey, { tags: v })}
            />
          </div>
          <datalist id="lang-list">
            {["English", "German", "French", "Spanish", "Italian", "Portuguese", "Czech", "Polish", "Slovak", "Turkish", "Dutch"].map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Section>

        <Section
          title="Location"
          right={
            data.lat != null && (
              <a
                className="text-xs text-indigo-600 hover:underline"
                target="_blank"
                rel="noreferrer"
                href={`https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=15/${data.lat}/${data.lon}`}
              >
                Open in OSM ↗
              </a>
            )
          }
        >
          <div className="text-sm">
            {data.lat != null ? (
              <div>
                <span
                  className={`mr-1 rounded px-1.5 py-0.5 text-xs ${data.geoSource === "approx" ? "bg-amber-100 text-amber-800" : data.geoSource === "manual" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}
                >
                  {data.geoSource === "approx" ? "approximate" : data.geoSource}
                </span>
                <span className="text-slate-600">{data.geoLabel}</span>
                <div className="text-xs text-slate-400">
                  {data.lat.toFixed(5)}, {data.lon?.toFixed(5)}
                </div>
              </div>
            ) : (
              <div className="text-amber-700">{data.geoSource === "failed" ? "Not found automatically." : "Not located yet."}</div>
            )}
          </div>
          {!ro && (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <button className={b("secondary", "text-xs")} disabled={geoBusy} onClick={runAuto}>
                  {geoBusy ? <Spinner /> : "🔄"} Auto-locate
                </button>
                <button className={b("secondary", "text-xs")} onClick={onStartPick}>
                  📍 Pick on map
                </button>
                {data.lat != null && (
                  <button
                    className={b("danger", "text-xs")}
                    onClick={() => store.setUni(uni.uniKey, { lat: undefined, lon: undefined, geoSource: "failed", geoLabel: "" })}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  placeholder="Search a place (address, campus, city)…"
                  value={geoQuery}
                  onChange={(e) => setGeoQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runSearch()}
                />
                <button className={b("secondary", "text-xs")} onClick={runSearch} disabled={geoBusy}>
                  Search
                </button>
              </div>
              {geoHits && (
                <div className="max-h-48 overflow-auto rounded border border-slate-200">
                  {geoHits.length === 0 && <div className="p-2 text-xs text-slate-500">No results</div>}
                  {geoHits.map((h, i) => (
                    <button
                      key={i}
                      className="block w-full border-b border-slate-100 px-2 py-1 text-left text-xs hover:bg-indigo-50"
                      onClick={() => {
                        store.setUni(uni.uniKey, { lat: h.lat, lon: h.lon, geoSource: "manual", geoLabel: h.label });
                        setGeoHits(null);
                      }}
                    >
                      {h.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input className={inputCls} placeholder="or coordinates: 48.1486, 17.1077" value={coords} onChange={(e) => setCoords(e.target.value)} />
                <button className={b("secondary", "text-xs")} onClick={applyCoords} disabled={!coords.trim()}>
                  Set
                </button>
              </div>
              {geoMsg && <div className="text-xs text-amber-700">{geoMsg}</div>}
            </div>
          )}
        </Section>

        <Section title={`Links (${links.length})`}>
          <ul className="flex flex-col gap-1 text-sm">
            {links.map((l) => (
              <li key={l.key} className="flex items-center gap-2">
                <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-indigo-600 hover:underline">
                  🔗 {l.label || l.url}
                </a>
                {!ro && (
                  <button className="text-xs text-slate-400 hover:text-rose-600" onClick={() => store.deleteLink(l.key)}>
                    ✕
                  </button>
                )}
              </li>
            ))}
          </ul>
          {!ro && (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!linkUrl.trim()) return;
                const url = /^https?:\/\//.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
                store.addLink(uni.uniKey, linkLabel.trim(), url);
                setLinkLabel("");
                setLinkUrl("");
              }}
            >
              <input className={`${inputCls} w-1/3`} placeholder="Label" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
              <input className={inputCls} placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
              <button className={b("secondary", "text-xs")} disabled={!linkUrl.trim()}>
                Add
              </button>
            </form>
          )}
        </Section>

        <Section title={`Notes (${notes.length})`}>
          <div className="flex flex-col gap-3">
            {[...notesByCat.entries()].map(([cat, items]) => (
              <div key={cat}>
                <div className="mb-1 text-xs font-medium text-indigo-700">{cat}</div>
                <div className="flex flex-col gap-1.5">
                  {items.map((n) => (
                    <div key={n.key} className="group rounded-md bg-slate-50 p-2 text-sm">
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
                        {!ro && (
                          <span className="ml-auto hidden gap-2 group-hover:flex">
                            <button className="hover:text-slate-700" onClick={() => setEditingNote(n.key)}>
                              Edit
                            </button>
                            <button className="hover:text-rose-600" onClick={() => confirm("Delete this note?") && store.deleteNote(n.key)}>
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
          {!ro && (
            <form
              className="mt-3 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!noteText.trim()) return;
                store.addNote(uni.uniKey, noteCat.trim() || "Other", noteText.trim());
                setNoteText("");
              }}
            >
              <input className={inputCls} list="note-cats" value={noteCat} onChange={(e) => setNoteCat(e.target.value)} placeholder="Category" />
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
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) (e.currentTarget.form as HTMLFormElement).requestSubmit();
                }}
              />
              <button className={b("primary", "self-end text-xs")} disabled={!noteText.trim()}>
                Add note
              </button>
            </form>
          )}
        </Section>
      </div>
    </aside>
  );
}
