import { COLLS } from "./types.ts";
import type { Coll, GardenData, Meta } from "./types.ts";

/* Pure, deterministic merge of two copies of the garden data (phone vs Dropbox, or two phones).
   - Every collection: union by id; the later `updated` wins; equal stamps break ties on content, so
     merge(a, b) equals merge(b, a).
   - A delete is a tombstone "<coll>:<id>" -> time. It beats any copy with updated <= that time; a
     later edit resurrects the record (edit wins over an older delete).
   - settings: one object, later `settingsAt` wins as a whole.
   Merge never drops data except what a tombstone says was deleted. */

export const TOMBSTONE_DAYS = 180; // must exceed the longest a device can stay offline
const DAY = 86_400_000;

/** JSON with sorted keys, so equal objects built in different key order compare equal. */
export const canon = (x: unknown): string =>
  JSON.stringify(x, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );
const pick = <T>(a: T, b: T): T => (canon(a) <= canon(b) ? a : b);
const byId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

type Rec = { id: string; updated: number };

function mergeColl<T extends Rec>(coll: Coll, a: T[], b: T[], tomb: Record<string, number>): T[] {
  const m = new Map<string, T>();
  for (const x of [...a, ...b]) {
    const have = m.get(x.id);
    m.set(x.id, !have ? x : have.updated > x.updated ? have : x.updated > have.updated ? x : pick(have, x));
  }
  for (const [id, x] of m) {
    const t = tomb[`${coll}:${id}`];
    if (t !== undefined && t >= x.updated) m.delete(id);
  }
  return byId([...m.values()]);
}

export function mergeData(local: GardenData, remote: GardenData): GardenData {
  const tomb: Record<string, number> = {};
  for (const src of [local.meta.tomb, remote.meta.tomb]) {
    for (const [k, t] of Object.entries(src ?? {})) if (!(tomb[k] >= t)) tomb[k] = t;
  }
  const la = local.meta.settingsAt ?? 0;
  const ra = remote.meta.settingsAt ?? 0;
  const settings = la > ra ? local.meta.settings : ra > la ? remote.meta.settings : pick(local.meta.settings, remote.meta.settings);
  const meta: Meta = { settings, settingsAt: Math.max(la, ra), tomb };
  return {
    items: mergeColl("items", local.items, remote.items, tomb),
    plants: mergeColl("plants", local.plants, remote.plants, tomb),
    steps: mergeColl("steps", local.steps, remote.steps, tomb),
    logs: mergeColl("logs", local.logs, remote.logs, tomb),
    done: mergeColl("done", local.done, remote.done, tomb),
    meta,
  };
}

function normal(d: GardenData): string {
  const out: Record<string, unknown> = { meta: d.meta };
  for (const c of COLLS) out[c] = byId(d[c] as Rec[]);
  return canon(out);
}
export const sameData = (a: GardenData, b: GardenData) => a === b || normal(a) === normal(b);

/** Drop tombstones older than TOMBSTONE_DAYS. Run before writing to Dropbox, never inside merge. */
export function pruneTombstones(d: GardenData, nowMs: number): GardenData {
  const cutoff = nowMs - TOMBSTONE_DAYS * DAY;
  const entries = Object.entries(d.meta.tomb);
  const keep = entries.filter(([, t]) => t >= cutoff);
  return keep.length === entries.length ? d : { ...d, meta: { ...d.meta, tomb: Object.fromEntries(keep) } };
}

/** Record a delete. Call this next to the code that removes the record. */
export function withTomb(meta: Meta, coll: Coll, id: string, nowMs: number): Meta {
  return { ...meta, tomb: { ...meta.tomb, [`${coll}:${id}`]: nowMs } };
}
