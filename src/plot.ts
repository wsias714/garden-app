const SNAP = 6;

export function dripSize(endX: number, endY: number, startX: number, startY: number,
                         availableWidth: number, availableHeight: number): { w: number; h: number } {
  const snappedWidth = Math.round((endX - startX) / SNAP) * SNAP;
  const snappedDrop = Math.round((endY - startY) / SNAP) * SNAP;
  return {
    w: Math.max(0, Math.min(availableWidth, Math.max(SNAP, snappedWidth))),
    h: Math.max(0, Math.min(availableHeight, Math.max(2, snappedDrop + 2))),
  };
}

/** Where a drip line's stretch handle sits: the line's far end. */
export function dripEnd(x: number, y: number, w: number, h: number): { x: number; y: number } {
  return { x: x + w, y: y + Math.max(0, h - 2) };
}

/**
 * Drip lines edit in a panel under the map, not a full-screen sheet. The sheet's scrim
 * covers the whole map, so the stretch handle on a selected drip line could not be
 * touched while the panel was open (feedback 0932e14f).
 */
export function itemEditsInline(kind: string): boolean {
  return kind === "drip";
}
