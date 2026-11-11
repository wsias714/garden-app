import { useState } from "react";
import type { ReactNode } from "react";
import { CATALOG, cropByKey } from "./catalog.ts";
import type { Crop, CropKind } from "./catalog.ts";
import { MONTHS, today } from "./dates.ts";
import { climateOf, waterInterval } from "./engine.ts";
import type { Store } from "./store.ts";
import { uid } from "./store.ts";
import type { MapItem, Plant, PlantStatus } from "./sync/types.ts";

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="btn ghost" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Single-weight botanical line glyphs, one per crop kind. */
export function Glyph({ kind, size = 20 }: { kind: CropKind | "tree"; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    veg: <><path d="M12 21V9" /><path d="M12 13c-4 0-6-3-6-6 4 0 6 2 6 6z" /><path d="M12 11c4 0 6-3 6-6-4 0-6 2-6 6z" /></>,
    herb: <><path d="M12 21V8" /><path d="M12 8c-2-3-1-5 0-6 1 1 2 3 0 6z" /><path d="M12 15c-3 0-5-2-5-4 3 0 5 1 5 4z" /><path d="M12 13c3 0 5-2 5-4-3 0-5 1-5 4z" /></>,
    fruit: <><circle cx="12" cy="14" r="6" /><path d="M12 8c0-2 1-4 3-4" /></>,
    berry: <><circle cx="9" cy="14" r="3" /><circle cx="15" cy="14" r="3" /><circle cx="12" cy="9" r="3" /></>,
    flower: <><circle cx="12" cy="10" r="2" /><path d="M12 8c0-3-2-4-2-4s-2 1-2 4M12 8c3 0 4-2 4-2s-1-2-4-2M12 12c0 3 2 4 2 4s2-1 2-4M12 12c-3 0-4 2-4 2s1 2 4 2" /><path d="M12 14v7" /></>,
    perennial: <><path d="M12 21V6" /><path d="M12 6c-3 0-5-2-5-4M12 6c3 0 5-2 5-4M12 12c-3 0-5-2-5-4M12 12c3 0 5-2 5-4" /></>,
    tree: <><circle cx="12" cy="9" r="6" /><path d="M12 15v6" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" {...common} aria-hidden>{paths[kind]}</svg>;
}

export function CropPicker({ onPick, onClose }: { onPick: (c: Crop | null) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const month = new Date().getMonth() + 1;
  const list = CATALOG.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet title="Add a plant" onClose={onClose}>
      <input className="field" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {list.map((c) => (
          <button key={c.key} className="row" onClick={() => onPick(c)}>
            <Glyph kind={c.kind} />
            <span className="grow">{c.name}</span>
            <span className="muted small">{c.opt.includes(month) ? "good now" : c.ok.includes(month) ? "possible now" : `best ${MONTHS[c.opt[0] - 1]}+`}</span>
          </button>
        ))}
        <button className="row" onClick={() => onPick(null)}>
          <span className="grow">Something else (custom)</span>
        </button>
      </div>
    </Sheet>
  );
}

export function newPlant(crop: Crop | null, name = ""): Plant {
  const jitter = () => 48 + Math.round(Math.random() * 6) * 4;
  return {
    id: uid(), name: crop?.name ?? (name || "New plant"), cropKey: crop?.key ?? "", itemId: "",
    x: jitter(), y: jitter(), planted: "", status: "planned", notes: "", updated: 0,
  };
}

const STATUSES: PlantStatus[] = ["planned", "growing", "harvesting", "done"];

export function PlantSheet({ plant, store, onClose }: { plant: Plant; store: Store; onClose: () => void }) {
  const crop = cropByKey(plant.cropKey);
  const clim = climateOf(plant);
  const defaults = climateOf({ ...plant, heatPlan: "", rainPlan: "", seasonNotes: "" });
  const [qty, setQty] = useState("");
  const set = (patch: Partial<Plant>) => store.upsert("plants", { ...plant, ...patch });
  const log = (kind: "water" | "harvest", text: string, n = 0, unit = "") =>
    store.upsert("logs", { id: uid(), date: today(), kind, plantId: plant.id, text, qty: n, unit, updated: 0 });
  return (
    <Sheet title={plant.name} onClose={onClose}>
      {crop && <p className="muted">{crop.tip}{crop.days ? ` About ${crop.days[0]}-${crop.days[1]} days to first harvest.` : ""}</p>}
      <label className="lbl">Name<input className="field" value={plant.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <label className="lbl">Status
        <select className="field" value={plant.status} onChange={(e) => set({ status: e.target.value as PlantStatus })}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label className="lbl">Planted on
        <input className="field" type="date" value={plant.planted} onChange={(e) => set({ planted: e.target.value, status: e.target.value && plant.status === "planned" ? "growing" : plant.status })} />
      </label>
      {!plant.planted && <button className="btn" onClick={() => set({ planted: today(), status: "growing" })}>Planted today</button>}
      <label className="lbl">Notes<textarea className="field" rows={3} value={plant.notes} onChange={(e) => set({ notes: e.target.value })} /></label>

      <h3>Weather care</h3>
      <p className="muted small">Blank means the app's default for this crop (shown in grey). These drive the watering schedule and the heat, rain, frost and wind alerts.</p>
      <div className="climate">
        <label className="lbl">Sun
          <select className="field" value={plant.sun ?? "full"} onChange={(e) => set({ sun: e.target.value as Plant["sun"] })}>
            <option value="full">Full sun</option><option value="part">Part shade</option><option value="shade">Shade</option>
          </select>
        </label>
        <label className="lbl">Water every (days)
          <input className="field" inputMode="numeric" placeholder={`auto: ${waterInterval({ ...plant, waterEveryDays: 0 }, crop, new Date().getMonth() + 1)}`}
            value={plant.waterEveryDays || ""} onChange={(e) => set({ waterEveryDays: Math.max(0, parseInt(e.target.value) || 0) })} />
        </label>
        <label className="lbl">Heat
          <select className="field" value={plant.heatTolerance ?? ""} onChange={(e) => set({ heatTolerance: e.target.value as Plant["heatTolerance"] })}>
            <option value="">Default ({clim.heat})</option><option value="tender">Tender (suffers above 85°F)</option><option value="ok">OK</option><option value="tough">Tough</option>
          </select>
        </label>
        <label className="lbl">Frost
          <select className="field" value={plant.frostTender ?? ""} onChange={(e) => set({ frostTender: e.target.value as Plant["frostTender"] })}>
            <option value="">Default ({clim.frostTender ? "tender" : "hardy"})</option><option value="yes">Tender</option><option value="no">Hardy</option>
          </select>
        </label>
        <label className="lbl">Heavy rain
          <select className="field" value={plant.rainSensitive ?? ""} onChange={(e) => set({ rainSensitive: e.target.value as Plant["rainSensitive"] })}>
            <option value="">Default ({clim.rainSensitive ? "sensitive" : "fine"})</option><option value="yes">Sensitive</option><option value="no">Fine</option>
          </select>
        </label>
        <label className="check-row lbl"><input type="checkbox" checked={!!plant.onDrip} onChange={(e) => set({ onDrip: e.target.checked })} /> On the drip timer</label>
      </div>
      <label className="lbl">In a heat wave<textarea className="field" rows={2} placeholder={defaults.heatCare} value={plant.heatPlan ?? ""} onChange={(e) => set({ heatPlan: e.target.value })} /></label>
      <label className="lbl">When it rains<textarea className="field" rows={2} placeholder={defaults.rainCare} value={plant.rainPlan ?? ""} onChange={(e) => set({ rainPlan: e.target.value })} /></label>
      <label className="lbl">Through the seasons<textarea className="field" rows={2} placeholder={defaults.season} value={plant.seasonNotes ?? ""} onChange={(e) => set({ seasonNotes: e.target.value })} /></label>
      <div className="btnrow">
        <button className="btn" onClick={() => { log("water", "Watered"); onClose(); }}>Watered today</button>
      </div>
      <div className="btnrow">
        <input className="field small-in" inputMode="decimal" placeholder="Amount" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button className="btn" onClick={() => { log("harvest", `Harvested ${plant.name}`, parseFloat(qty) || 0, "pcs"); if (plant.status === "growing") set({ status: "harvesting" }); onClose(); }}>Log harvest</button>
      </div>
      <button className="btn danger" onClick={() => { store.remove("plants", plant.id); onClose(); }}>Remove plant</button>
    </Sheet>
  );
}

export function ItemSheet({ item, store, onClose }: { item: MapItem; store: Store; onClose: () => void }) {
  const set = (patch: Partial<MapItem>) => store.upsert("items", { ...item, ...patch });
  const line = item.kind === "drip" || item.kind === "trellis";
  const round = item.kind === "tree" || item.kind === "container";
  const step = (k: "w" | "h", d: number) => set({ [k]: Math.max(line && k === "h" ? 2 : 6, item[k] + d) });
  return (
    <Sheet title={item.label || item.kind} onClose={onClose}>
      <label className="lbl">Label<input className="field" value={item.label} onChange={(e) => set({ label: e.target.value })} /></label>
      <div className="steppers">
        {(round ? (["w"] as const) : (["w", "h"] as const)).map((k) => (
          <div key={k} className="stepper">
            <span>{line ? (k === "w" ? "Length" : "Slope") : round ? "Diameter" : k === "w" ? "Width" : "Length"} {item[k]} in</span>
            <button className="btn" onClick={() => step(k, -6)}>-6</button>
            <button className="btn" onClick={() => step(k, 6)}>+6</button>
          </div>
        ))}
      </div>
      <p className="muted small">Drag it on the map to move. Sizes are in inches, 6 in steps.</p>
      <button className="btn danger" onClick={() => { store.remove("items", item.id); onClose(); }}>Remove</button>
    </Sheet>
  );
}
