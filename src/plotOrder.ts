import type { MapItem } from "./sync/types.ts";

/** Draw beds first so other plot items and plants remain visible above them. */
export function bedsUnder(items: MapItem[]): MapItem[] {
  return [...items].sort((a, b) => Number(a.kind !== "bed") - Number(b.kind !== "bed"));
}
