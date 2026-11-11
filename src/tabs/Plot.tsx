import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import { cropByKey } from "../catalog.ts";
import type { Store } from "../store.ts";
import { uid } from "../store.ts";
import type { ItemKind, MapItem, Plant } from "../sync/types.ts";
import { CropPicker, Glyph, ItemSheet, PlantSheet, newPlant } from "../ui.tsx";

const PLOT = 120; // inches: 10 ft square (the real size is still to confirm)
const SNAP = 6;
const snap = (n: number) => Math.round(n / SNAP) * SNAP;
type Sel = { type: "item" | "plant"; id: string } | null;
interface Drag { type: "item" | "plant"; id: string; dx: number; dy: number; x: number; y: number; moved: boolean; sx: number; sy: number }

const ADD: { kind: ItemKind; label: string; w: number; h: number }[] = [
  { kind: "bed", label: "Bed", w: 36, h: 24 },
  { kind: "tree", label: "Tree", w: 24, h: 24 },
  { kind: "mint", label: "Mint zone", w: 24, h: 24 },
  { kind: "drip", label: "Drip line", w: 60, h: 2 },
  { kind: "label", label: "Label", w: 30, h: 8 },
];

export function PlotTab({ store, plain }: { store: Store; plain: boolean }) {
  const { items, plants } = store.data;
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [picker, setPicker] = useState(false);

  const pt = (e: PointerEvent) => {
    const s = svg.current!;
    const p = s.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const m = p.matrixTransform(s.getScreenCTM()!.inverse());
    return { x: m.x, y: m.y };
  };

  const down = (e: PointerEvent, type: "item" | "plant", id: string, ox: number, oy: number) => {
    e.stopPropagation();
    svg.current!.setPointerCapture(e.pointerId);
    const p = pt(e);
    setDrag({ type, id, dx: p.x - ox, dy: p.y - oy, x: ox, y: oy, moved: false, sx: e.clientX, sy: e.clientY });
  };
  const move = (e: PointerEvent) => {
    if (!drag) return;
    const p = pt(e);
    const moved = drag.moved || Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 5;
    setDrag({ ...drag, x: snap(p.x - drag.dx), y: snap(p.y - drag.dy), moved });
  };
  const up = () => {
    if (!drag) return;
    if (!drag.moved) setSel({ type: drag.type, id: drag.id });
    else if (drag.type === "item") {
      const it = items.find((i) => i.id === drag.id);
      if (it) store.upsert("items", { ...it, x: drag.x, y: drag.y });
    } else {
      const p = plants.find((i) => i.id === drag.id);
      if (p) {
        const bed = items.find((i) => i.kind === "bed" && drag.x >= i.x && drag.x <= i.x + i.w && drag.y >= i.y && drag.y <= i.y + i.h);
        store.upsert("plants", { ...p, x: drag.x, y: drag.y, itemId: bed?.id ?? "" });
      }
    }
    setDrag(null);
  };

  const at = (it: MapItem) => (drag?.type === "item" && drag.id === it.id ? { x: drag.x, y: drag.y } : { x: it.x, y: it.y });
  const atP = (p: Plant) => (drag?.type === "plant" && drag.id === p.id ? { x: drag.x, y: drag.y } : { x: p.x, y: p.y });

  const addItem = (a: (typeof ADD)[number]) => {
    const it: MapItem = { id: uid(), kind: a.kind, label: a.kind === "label" ? "Note" : a.label, x: 42, y: 42, w: a.w, h: a.h, updated: 0 };
    store.upsert("items", it);
    setSel({ type: "item", id: it.id });
  };

  const selItem = sel?.type === "item" ? items.find((i) => i.id === sel.id) : undefined;
  const selPlant = sel?.type === "plant" ? plants.find((i) => i.id === sel.id) : undefined;

  return (
    <div className="page">
      <h1 className="title">Plot</h1>
      <div className="mapwrap">
        <svg ref={svg} viewBox={`-10 -10 ${PLOT + 20} ${PLOT + 20}`} className="map" onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <defs>
            <filter id="pencil"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" /></filter>
            <pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#6fa57a" strokeWidth="1.2" /></pattern>
          </defs>
          <g filter={plain ? undefined : "url(#pencil)"}>
            <rect x="0" y="0" width={PLOT} height={PLOT} className="ground" />
            {items.map((it) => {
              const { x, y } = at(it);
              const on = sel?.type === "item" && sel.id === it.id;
              const common = { onPointerDown: (e: PointerEvent) => down(e, "item", it.id, it.x, it.y), className: on ? "sel" : "" };
              if (it.kind === "bed") return <g key={it.id} {...common}><rect x={x} y={y} width={it.w} height={it.h} rx="3" className="bed" /><text x={x + 3} y={y + 7} className="blabel">{it.label}</text></g>;
              if (it.kind === "tree") return <g key={it.id} {...common}><circle cx={x + it.w / 2} cy={y + it.h / 2} r={it.w / 2} className="tree" /><text x={x + it.w / 2} y={y + it.h / 2 + 2} textAnchor="middle" className="blabel">{it.label}</text></g>;
              if (it.kind === "mint") return <g key={it.id} {...common}><rect x={x} y={y} width={it.w} height={it.h} rx="3" className="mint" /><text x={x + 3} y={y + 7} className="blabel">{it.label}</text></g>;
              if (it.kind === "drip") return <g key={it.id} {...common}><line x1={x} y1={y} x2={x + it.w} y2={y + Math.max(0, it.h - 2)} className="drip" /><line x1={x} y1={y} x2={x + it.w} y2={y + Math.max(0, it.h - 2)} className="hit" /></g>;
              return <g key={it.id} {...common}><text x={x} y={y + 6} className="note">{it.label}</text><rect x={x} y={y} width={it.w} height={it.h} fill="transparent" /></g>;
            })}
            {plants.filter((p) => p.status !== "done").map((p) => {
              const { x, y } = atP(p);
              const crop = cropByKey(p.cropKey);
              const r = Math.max(5, (crop?.spacingIn ?? 12) / 2);
              const on = sel?.type === "plant" && sel.id === p.id;
              return (
                <g key={p.id} onPointerDown={(e) => down(e, "plant", p.id, p.x, p.y)} className={on ? "sel" : ""}>
                  <circle cx={x} cy={y} r={r} className={p.status === "planned" ? "foot planned" : "foot"} />
                  <g transform={`translate(${x - 4},${y - 4}) scale(0.34)`} className="plantglyph"><Glyph kind={crop?.kind ?? "veg"} size={24} /></g>
                  <text x={x} y={y + r + 5} textAnchor="middle" className="plabel">{p.name}</text>
                </g>
              );
            })}
          </g>
          <text x={PLOT - 14} y="-3" className="north">N? (confirm)</text>
        </svg>
      </div>
      <p className="muted small">Layout is a first guess: drag things to match the real plot. Everything snaps to 6 inches; tap to edit.</p>
      <div className="chips">
        {ADD.map((a) => <button key={a.kind} className="chip" onClick={() => addItem(a)}>+ {a.label}</button>)}
        <button className="chip primary" onClick={() => setPicker(true)}>+ Plant</button>
      </div>
      {picker && <CropPicker onClose={() => setPicker(false)} onPick={(c) => { const p = newPlant(c); store.upsert("plants", p); setPicker(false); setSel({ type: "plant", id: p.id }); }} />}
      {selItem && <ItemSheet key={selItem.id} item={selItem} store={store} onClose={() => setSel(null)} />}
      {selPlant && <PlantSheet key={selPlant.id} plant={selPlant} store={store} onClose={() => setSel(null)} />}
    </div>
  );
}
