import { mergeData, pruneTombstones, sameData } from "./merge.ts";
import type { GardenData } from "./types.ts";

/* Sync engine against a tiny `Remote` interface, so it is tested with an in-memory fake and runs
   against Dropbox in the app. Rev-based writes: a write can never silently overwrite a newer file. */

export const DATA_PATH = "/data.json";
export const BACKUP_DIR = "/backups";
export const DATA_BUDGET = 1_000_000; // bytes; photos never live in data.json
const WEEK = 7 * 86_400_000;
const KEEP_BACKUPS = 8;

export class ConflictError extends Error {
  constructor() {
    super("remote file changed since it was read");
  }
}
export interface RemoteFile {
  text: string;
  rev: string;
}
export interface RemoteEntry {
  path: string;
  modified: string;
  size: number;
}
export interface Remote {
  read(path: string): Promise<RemoteFile | null>;
  /** rev=null means "create, and fail with ConflictError if it already exists". */
  write(path: string, text: string, rev: string | null): Promise<{ rev: string }>;
  list(dir: string): Promise<RemoteEntry[]>;
  remove(path: string): Promise<void>;
}

export interface SyncResult {
  data: GardenData;
  pushed: boolean;
  dataBytes: number;
  warning: string;
}

const MAX_ATTEMPTS = 5;
export const sizeOf = (s: string) => new TextEncoder().encode(s).length;

export function parseData(text: string): GardenData {
  const p = JSON.parse(text) as Partial<GardenData>;
  if (!p || !Array.isArray(p.plants) || !Array.isArray(p.items) || !p.meta || typeof p.meta !== "object") {
    throw new Error("data.json is not a Garden Journal file");
  }
  return {
    items: p.items,
    plants: p.plants,
    steps: Array.isArray(p.steps) ? p.steps : [],
    logs: Array.isArray(p.logs) ? p.logs : [],
    done: Array.isArray(p.done) ? p.done : [],
    meta: { settings: p.meta.settings, settingsAt: p.meta.settingsAt ?? 0, tomb: p.meta.tomb ?? {} },
  };
}

const backupName = (now: number) => `${BACKUP_DIR}/auto-${new Date(now).toISOString().slice(0, 10)}.json`;
export function backupDue(existing: string[], now: number): boolean {
  const last = existing.map((p) => Date.parse(p.slice(-15, -5))).filter((n) => !Number.isNaN(n));
  return !last.length || now - Math.max(...last) >= WEEK;
}
export function backupsToDelete(existing: string[]): string[] {
  return [...existing].sort().slice(0, Math.max(0, existing.length - KEEP_BACKUPS));
}
const warn = (bytes: number) => (bytes >= DATA_BUDGET * 0.7 ? `Data file is ${(bytes / 1e6).toFixed(2)} MB of 1 MB; finished seasons will move to an archive.` : "");

/** Pull remote, merge with `local`, push only if that changed anything. */
export async function syncGarden(remote: Remote, local: GardenData, opts: { now?: number } = {}): Promise<SyncResult> {
  const now = opts.now ?? Date.now();
  let working = local;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const r = await remote.read(DATA_PATH);
    const remoteData = r ? parseData(r.text) : null;
    const merged = pruneTombstones(remoteData ? mergeData(working, remoteData) : working, now);

    if (r && remoteData && sameData(merged, remoteData)) {
      const bytes = sizeOf(r.text);
      return { data: merged, pushed: false, dataBytes: bytes, warning: warn(bytes) };
    }

    let backups: string[] = [];
    if (r) {
      backups = (await remote.list(BACKUP_DIR)).map((e) => e.path);
      if (backupDue(backups, now)) {
        try {
          await remote.write(backupName(now), r.text, null);
          backups.push(backupName(now));
        } catch (e) {
          if (!(e instanceof ConflictError)) throw e;
        }
      }
    }

    const text = JSON.stringify(merged);
    try {
      await remote.write(DATA_PATH, text, r?.rev ?? null);
    } catch (e) {
      if (e instanceof ConflictError) {
        working = merged;
        continue;
      }
      throw e;
    }
    for (const p of backupsToDelete(backups)) {
      try {
        await remote.remove(p);
      } catch {
        /* a leftover old backup is harmless */
      }
    }
    const bytes = sizeOf(text);
    return { data: merged, pushed: true, dataBytes: bytes, warning: warn(bytes) };
  }
  throw new Error("Dropbox kept changing underneath the sync; try again in a moment.");
}
