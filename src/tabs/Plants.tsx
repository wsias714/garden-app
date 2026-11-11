import { useState } from "react";
import { cropByKey } from "../catalog.ts";
import { pretty } from "../dates.ts";
import type { Store } from "../store.ts";
import type { PlantStatus } from "../sync/types.ts";
import { CropPicker, Glyph, PlantSheet, newPlant } from "../ui.tsx";

const ORDER: PlantStatus[] = ["harvesting", "growing", "planned", "done"];

export function PlantsTab({ store }: { store: Store }) {
  const { plants, items } = store.data;
  const [open, setOpen] = useState("");
  const [picker, setPicker] = useState(false);
  const cur = plants.find((p) => p.id === open);
  return (
    <div className="page">
      <h1 className="title">Plants</h1>
      <button className="btn primary" onClick={() => setPicker(true)}>+ Add a plant</button>
      {plants.length === 0 && <p className="muted">Nothing here yet. Add a plant, then mark it planted to start its watering, feeding and harvest reminders.</p>}
      {ORDER.map((st) => {
        const list = plants.filter((p) => p.status === st);
        if (!list.length) return null;
        return (
          <section key={st}>
            <h3>{st[0].toUpperCase() + st.slice(1)}</h3>
            {list.map((p) => {
              const crop = cropByKey(p.cropKey);
              const bed = items.find((i) => i.id === p.itemId);
              return (
                <button key={p.id} className="row" onClick={() => setOpen(p.id)}>
                  <Glyph kind={crop?.kind ?? "veg"} />
                  <span className="grow">{p.name}<span className="muted small block">{bed ? bed.label : "not on a bed"}{p.planted ? ` · planted ${pretty(p.planted)}` : ""}</span></span>
                </button>
              );
            })}
          </section>
        );
      })}
      {picker && <CropPicker onClose={() => setPicker(false)} onPick={(c) => { const p = newPlant(c); store.upsert("plants", p); setPicker(false); setOpen(p.id); }} />}
      {cur && <PlantSheet key={cur.id} plant={cur} store={store} onClose={() => setOpen("")} />}
    </div>
  );
}
