/* Garden Journal data. Every record has a string `id` and an `updated` stamp (ms). Deletes write a
   tombstone keyed "<collection>:<id>". Plot geometry is in inches, origin top-left of the plot. */

export type ItemKind = "bed" | "tree" | "mint" | "drip" | "label";
export interface MapItem {
  id: string;
  kind: ItemKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  updated: number;
}

export type PlantStatus = "planned" | "growing" | "harvesting" | "done";
export interface Plant {
  id: string;
  name: string;
  cropKey: string; // catalog key, or "" for a custom plant
  itemId: string; // bed it sits in, or ""
  x: number; // centre, inches
  y: number;
  planted: string; // YYYY-MM-DD or ""
  status: PlantStatus;
  notes: string;
  /* Climate care (optional so older saved plants still load). Empty means "use the catalog default". */
  waterEveryDays?: number; // 0 or missing = automatic from catalog and season
  onDrip?: boolean; // watered by the drip timer: no manual water reminders, timer alerts instead
  sun?: "full" | "part" | "shade";
  heatTolerance?: "" | "tender" | "ok" | "tough";
  frostTender?: "" | "yes" | "no";
  rainSensitive?: "" | "yes" | "no";
  heatPlan?: string;
  rainPlan?: string;
  seasonNotes?: string;
  updated: number;
}

export interface Step {
  id: string;
  project: string; // "mint" | "drip" | "replant" | user-defined
  title: string;
  note: string;
  done: boolean;
  doneAt: string; // YYYY-MM-DD or ""
  order: number;
  updated: number;
}

export type LogKind = "harvest" | "water" | "care" | "note";
export interface LogEntry {
  id: string;
  date: string;
  kind: LogKind;
  plantId: string;
  text: string;
  qty: number; // 0 = none
  unit: string;
  updated: number;
}

/** Only completions of generated tasks are stored; the schedule itself is recomputed. */
export interface Done {
  id: string; // task id, e.g. "water:<plantId>:2026-11-12"
  at: string; // YYYY-MM-DD it was marked
  state: "done" | "skipped" | "open";
  title: string;
  updated: number;
}

export interface Settings {
  plain: boolean; // Plain mode: no paper texture or pencil wobble
  lat: number;
  lon: number;
}

export interface Meta {
  settings: Settings;
  settingsAt: number;
  tomb: Record<string, number>;
}

export interface GardenData {
  items: MapItem[];
  plants: Plant[];
  steps: Step[];
  logs: LogEntry[];
  done: Done[];
  meta: Meta;
}

export type Coll = "items" | "plants" | "steps" | "logs" | "done";
export const COLLS: Coll[] = ["items", "plants", "steps", "logs", "done"];
