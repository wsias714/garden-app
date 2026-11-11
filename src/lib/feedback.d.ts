export interface FeedbackItem {
  id: string;
  app: string;
  kind: "bug" | "idea" | "other";
  text: string;
  ts: string;
  version: string;
  device: { kind: string; ua: string; screen: string; standalone: string };
}
export interface FeedbackOptions {
  /** Key in ai-housekeeping/config/feedback-apps.json. */
  app: string;
  version?: string;
  /** Store the item where the collector reads it. Throw to keep it queued on the device. */
  upload?: (item: FeedbackItem) => Promise<unknown>;
  /** Same-origin route that accepts the item as a JSON POST (desktop apps). */
  endpoint?: string;
  /** Extra request headers for `endpoint` (e.g. Bench's phone view needs X-Bench-Mobile). */
  headers?: Record<string, string>;
  /** Press-and-hold time in ms before the panel opens (kids' games). Default 0 = tap. */
  hold?: number;
  /** Pixels above the bottom safe area. Default 14: raise it to clear a tab bar. */
  bottom?: number;
  side?: "left" | "right";
  /** false = no floating button; the app calls the returned open() from its Settings. Default true. */
  fab?: boolean;
  email?: string;
  label?: string;
}
export function initFeedback(opts: FeedbackOptions): { flush: () => Promise<number | void>; open: () => void };
