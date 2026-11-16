import type { ItemKind } from "./sync/types.ts";

export function sizeStep(kind: ItemKind): number {
  return kind === "bed" || kind === "container" ? 2 : 6;
}
