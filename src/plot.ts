const SNAP = 6;

export function dripSize(endX: number, endY: number, startX: number, startY: number,
                         plotWidth: number, plotHeight: number): { w: number; h: number } {
  const delta = (end: number, start: number, max: number) => {
    const snapped = Math.round((end - start) / SNAP) * SNAP;
    const lower = -start;
    const upper = max - start;
    const bounded = Math.max(lower, Math.min(upper, snapped));
    if (snapped === 0) return bounded;
    if (Math.abs(bounded) < SNAP) return bounded;
    if (bounded < 0) return Math.min(-SNAP, bounded);
    return Math.max(SNAP, bounded);
  };
  const dx = delta(endX, startX, plotWidth);
  const dy = delta(endY, startY, plotHeight);
  return { w: dx, h: dy + 2 };
}

/** Where a drip line's stretch handle sits: the line's far end. */
export function dripEnd(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return { x: x + w, y: y + h - 2 };
}

/**
 * Drip lines edit in a panel under the map, not a full-screen sheet. The sheet's scrim
 * covers the whole map, so the stretch handle on a selected drip line could not be
 * touched while the panel was open (feedback 0932e14f).
 */
export function itemEditsInline(kind: string): boolean {
  return kind === "drip";
}
