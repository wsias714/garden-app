import { useState } from "react";
import { pretty, today } from "../dates.ts";
import type { Store } from "../store.ts";
import { uid } from "../store.ts";

export function JournalTab({ store }: { store: Store }) {
  const { logs, plants } = store.data;
  const [text, setText] = useState("");
  const name = (id: string) => plants.find((p) => p.id === id)?.name ?? "";
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.id < b.id ? 1 : -1));

  const totals = new Map<string, { qty: number; n: number }>();
  for (const l of logs) {
    if (l.kind !== "harvest") continue;
    const k = name(l.plantId) || "Other";
    const t = totals.get(k) ?? { qty: 0, n: 0 };
    totals.set(k, { qty: t.qty + l.qty, n: t.n + 1 });
  }

  return (
    <div className="page">
      <h1 className="title">Journal</h1>
      <div className="btnrow">
        <input className="field" placeholder="A note about the garden" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary" disabled={!text.trim()} onClick={() => { store.upsert("logs", { id: uid(), date: today(), kind: "note", plantId: "", text: text.trim(), qty: 0, unit: "", updated: 0 }); setText(""); }}>Add</button>
      </div>
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
        {sorted.map((l) => (
          <div className="entry" key={l.id}>
            <span className="muted small">{pretty(l.date)}</span>
            <div className="grow">{l.text}{l.plantId && l.kind !== "harvest" ? ` · ${name(l.plantId)}` : ""}{l.qty ? ` (${l.qty} ${l.unit})` : ""}</div>
            <button className="btn ghost" aria-label="Delete entry" onClick={() => store.remove("logs", l.id)}>×</button>
          </div>
        ))}
      </section>
    </div>
  );
}
