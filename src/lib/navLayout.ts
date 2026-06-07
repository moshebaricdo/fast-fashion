/** Space reserved for the floating nav pill + safe area (matches layout `main` padding). */
export const FLOATING_NAV_INSET = "calc(4.5rem + env(safe-area-inset-bottom))";

/** Gap between outfit segment row and grid — matches StickyChrome `pb-4` at rest. */
export const OUTFIT_GRID_GAP = "1rem";

/** Nav inset plus breathing room below the grid (mirrors the segment-to-grid gap). */
export const FLOATING_NAV_CLEARANCE =
  "calc(4.5rem + env(safe-area-inset-bottom) + 1rem)";
