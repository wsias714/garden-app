import { uid } from "./store.ts";
import type { MapItem } from "./sync/types.ts";

export const MAX_PHOTOS = 4;
/** Photos live on this device only (never in the synced data.json, which has a 1 MB budget). */
export const PHOTO_KEY = "garden-photos-v1";
export type Photo = { id: string; date: string; data: string };
export type Photos = Record<string, Photo[]>; // plant id -> newest first

/** Plan a bigger replacement for a planter: start at its current size, then +2 in per tap. */
export function sizeUp(item: MapItem): MapItem {
  return { ...item, replaceW: (item.replaceW ?? item.w) + 2 };
}

export function addPhoto(all: Photos, plantId: string, data: string, date: string): Photos {
  return { ...all, [plantId]: [{ id: uid(), date, data }, ...(all[plantId] ?? [])].slice(0, MAX_PHOTOS) };
}

export function loadPhotos(): Photos {
  try { return JSON.parse(window.localStorage.getItem(PHOTO_KEY) ?? "{}") as Photos; } catch { return {}; }
}

/** False when the browser refuses the write (storage full), so the caller can tell the user. */
export function savePhotos(all: Photos): boolean {
  try { window.localStorage.setItem(PHOTO_KEY, JSON.stringify(all)); return true; } catch { return false; }
}
