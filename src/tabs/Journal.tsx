import { useState } from "react";
import { pretty, today, validDate } from "../dates.ts";
import type { LogEntry } from "../sync/types.ts";
import type { Store } from "../store.ts";
import { uid } from "../store.ts";

type Note = LogEntry & { categories?: string[]; picture?: string };

export function JournalTab({ store }: { store: Store }) {
  const { logs, plants } = store.data;
  const [editing, setEditing] = useState<Note | null>(null);
  const [text, setText] = useState("");
  const [categories, setCategories] = useState("");
  const [picture, setPicture] = useState("");
  const [date, setDate] = useState("");
  const name = (id: string) => plants.find((p) => p.id === id)?.name ?? "";
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

  const totals = new Map<string, { qty: number; n: number }>();
  for (const l of logs) {
    if (l.kind !== "harvest") continue;
    const k = name(l.plantId) || "Other";
    const t = totals.get(k) ?? { qty: 0, n: 0 };
    totals.set(k, { qty: t.qty + l.qty, n: t.n + 1 });
  }

  const openNote = (note?: Note) => {
    setEditing(note ?? { id: uid(), date: today(), kind: "note", plantId: "", text: "", qty: 0, unit: "", updated: 0 });
    setText(note?.text ?? "");
    setCategories(note?.categories?.join(", ") ?? "");
    setPicture(note?.picture ?? "");
    setDate(note?.date ?? today());
  };
  const saveNote = () => {
    if (!editing || !text.trim()) return;
    const note: Note = { ...editing, date: validDate(date) ? date : editing.date, text: text.trim(), categories: categories.split(",").map((x) => x.trim()).filter(Boolean), picture };
    store.upsert("logs", note);
    setEditing(null);
  };

  return (
    <div className="page">
      <h1 className="title">Journal</h1>
      <div className="btnrow"><button className="btn primary" onClick={() => openNote()}>New note</button></div>
      {totals.size > 0 && (
        <section>
          <h3>Harvest so far</h3>
          <div className="card">
            {[...totals].map(([k, t]) => <div key={k} className="kv"><span>{k}</span><span className="muted">{t.n} pick{t.n === 1 ? "" : "s"}{t.qty ? ` · ${t.qty} total` : ""}</span></div>)}
          </div>
        </section>
      )}
      <section>
        <h3>Entries</h3>
        {sorted.length === 0 && <p className="muted">Watering, harvests and notes will collect here, so next year's plan can learn from this one.</p>}
        {sorted.map((l) => {
          const note = l as Note;
          return <div className="entry" key={l.id}>
            <span className="muted small">{pretty(l.date)}</span>
            <div className="grow">{l.text}{l.plantId && l.kind !== "harvest" ? ` · ${name(l.plantId)}` : ""}{l.qty ? ` (${l.qty} ${l.unit})` : ""}
              {note.categories?.length ? <div className="muted small">{note.categories.join(" · ")}</div> : null}
              {note.picture ? <img className="journal-picture" src={note.picture} alt="Attached to note" /> : null}
            </div>
            {l.kind === "note" && <button className="btn ghost" aria-label="Edit note" onClick={() => openNote(note)}>Edit</button>}
            <button className="btn ghost" aria-label="Delete entry" onClick={() => store.remove("logs", l.id)}>×</button>
          </div>;
        })}
      </section>
      {editing && <div className="scrim" onClick={() => setEditing(null)}><div className="sheet" role="dialog" aria-modal="true" aria-label="Journal note editor" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head"><h2>{logs.some((l) => l.id === editing.id) ? "Edit note" : "New note"}</h2><button className="btn ghost" aria-label="Close editor" onClick={() => setEditing(null)}>×</button></div>
        <label className="lbl">Note<textarea className="field" rows={5} value={text} onChange={(e) => setText(e.target.value)} autoFocus /></label>
        <label className="lbl">Date <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="lbl">Categories<input className="field" placeholder="e.g. pests, soil, planting" value={categories} onChange={(e) => setCategories(e.target.value)} /></label>
        <label className="lbl">Picture <input className="field" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setPicture(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); }} /></label>
        {picture && <div><img className="journal-picture" src={picture} alt="Note attachment preview" /><button className="btn ghost" onClick={() => setPicture("")}>Remove picture</button></div>}
        <div className="btnrow"><button className="btn primary" disabled={!text.trim()} onClick={saveNote}>Save note</button><button className="btn" onClick={() => setEditing(null)}>Cancel</button></div>
      </div></div>}
    </div>
  );
}
