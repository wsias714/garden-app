import { useCallback, useEffect, useRef, useState } from "react";
import { emptyData } from "./seed.ts";
import { parseData } from "./sync/remote.ts";
import { compactDone, withTomb } from "./sync/merge.ts";
import { SEED_STEPS } from "./seed.ts";
import type { Coll, Done, GardenData, Settings } from "./sync/types.ts";

const KEY = "garden-data-v1";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function load(): GardenData {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const d = parseData(raw);
      // Starter steps nobody has edited (updated 0) pick up the current wording; deleted ones stay deleted.
      const seed = new Map(SEED_STEPS.map((x) => [x.id, x]));
      const steps = d.steps.map((x) => (x.updated === 0 && seed.has(x.id) ? seed.get(x.id)! : x));
      for (const x of SEED_STEPS) if (!steps.some((y) => y.id === x.id) && d.meta.tomb[`steps:${x.id}`] === undefined) steps.push(x);
      return compactDone({ ...d, steps }, Date.now());
    }
  } catch {
    /* fall through to the starter data */
  }
  return emptyData();
}

type Rec = { id: string; updated: number };

export interface Store {
  data: GardenData;
  ready: boolean;
  apply: (fn: (cur: GardenData) => GardenData) => void;
  upsert: <C extends Coll>(coll: C, rec: GardenData[C][number]) => void;
  remove: (coll: Coll, id: string) => void;
  setDone: (id: string, title: string, state: Done["state"], today: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

export function useStore(): Store {
  const [data, setData] = useState<GardenData>(load);
  const [ready] = useState(true);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
    }
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: the in-memory copy still works */
    }
  }, [data]);

  const apply = useCallback((fn: (cur: GardenData) => GardenData) => setData(fn), []);

  const upsert = useCallback<Store["upsert"]>((coll, rec) => {
    setData((cur) => {
      const list = cur[coll] as Rec[];
      const next = { ...(rec as Rec), updated: Date.now() };
      const i = list.findIndex((x) => x.id === next.id);
      const merged = i < 0 ? [...list, next] : list.map((x, j) => (j === i ? next : x));
      return { ...cur, [coll]: merged };
    });
  }, []);

  const remove = useCallback((coll: Coll, id: string) => {
    setData((cur) => ({
      ...cur,
      [coll]: (cur[coll] as Rec[]).filter((x) => x.id !== id),
      meta: withTomb(cur.meta, coll, id, Date.now()),
    }));
  }, []);

  const setDone = useCallback((id: string, title: string, state: Done["state"], today: string) => {
    setData((cur) => {
      const rec: Done = { id, at: today, state, title, updated: Date.now() };
      const i = cur.done.findIndex((x) => x.id === id);
      return { ...cur, done: i < 0 ? [...cur.done, rec] : cur.done.map((x, j) => (j === i ? rec : x)) };
    });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setData((cur) => ({ ...cur, meta: { ...cur.meta, settings: { ...cur.meta.settings, ...patch }, settingsAt: Date.now() } }));
  }, []);

  return { data, ready, apply, upsert, remove, setDone, setSettings };
}
