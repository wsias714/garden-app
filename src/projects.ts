import type { Step } from "./sync/types.ts";

/* Project lists on the Today tab. The three starter lists have fixed keys; a list the user makes
   is stored as plain steps whose project key is "u:<name>", so no schema or sync change is needed. */

export const USER_PREFIX = "u:";

export function projectName(key: string, starters: Record<string, string>): string {
  return starters[key] ?? (key.startsWith(USER_PREFIX) ? key.slice(USER_PREFIX.length) : key);
}

/** Starter lists first (even when emptied), then any user lists found in the steps, in first-seen order. */
export function projectKeys(steps: Step[], starters: Record<string, string>): string[] {
  const keys = Object.keys(starters);
  for (const s of [...steps].sort((a, b) => a.order - b.order)) if (!keys.includes(s.project)) keys.push(s.project);
  return keys;
}

/** The next step goes last in its list. */
export function nextOrder(steps: Step[]): number {
  return steps.reduce((m, s) => Math.max(m, s.order), -1) + 1;
}

export function newStep(project: string, title: string, steps: Step[], id: string): Step {
  return { id, project, title: title.trim(), note: "", done: false, doneAt: "", order: nextOrder(steps), updated: 0 };
}
