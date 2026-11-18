import { uid } from "./store.ts";
import type { MapItem, Plant } from "./sync/types.ts";

export const MAX_PHOTOS = 4; // small downscaled photos live in the synced JSON, so keep them few

/** Plan a bigger replacement for a planter: start at its current size, then +2 in per tap. */
export function sizeUp(item: MapItem): MapItem {
  return { ...item, replaceW: (item.replaceW ?? item.w) + 2 };
}

export function addPhoto(plant: Plant, data: string, date: string): Plant {
  const photos = [{ id: uid(), date, data }, ...(plant.photos ?? [])].slice(0, MAX_PHOTOS);
  return { ...plant, photos };
}
