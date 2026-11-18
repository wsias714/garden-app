import { CATALOG } from "./catalog.ts";
import { uid } from "./store.ts";
import type { Plant } from "./sync/types.ts";

export const FLAG_LABEL = { weeding: "Needs weeding", replant: "Needs replanting" } as const;

/** One-step add: match a catalog crop by name (else custom), already planted today. */
export function quickPlant(name: string, today: string): Plant {
  const q = name.trim().toLowerCase();
  const crop = CATALOG.find((c) => c.name.toLowerCase() === q) ?? null;
  return {
    id: uid(), name: crop?.name ?? (name.trim() || "New plant"), cropKey: crop?.key ?? "", itemId: "",
    x: 48, y: 48, planted: today, status: "growing", notes: "", updated: 0,
  };
}

export const flaggedPlants = (plants: Plant[]): Plant[] => plants.filter((p) => (p.flag === "weeding" || p.flag === "replant") && p.status !== "done");

/** Label for a flag value; unknown values (older or hand-edited data) show nothing. */
export const flagLabel = (f: string | undefined): string => (f === "weeding" || f === "replant" ? FLAG_LABEL[f] : "");
