/** Extra lift above the iOS home indicator / grab handle. */
export const FLOATING_NAV_IOS_LIFT = "12px";

/** Space reserved for the floating nav pill + safe area (matches layout `main` padding). */
export const FLOATING_NAV_INSET = `calc(4.5rem + env(safe-area-inset-bottom) + ${FLOATING_NAV_IOS_LIFT})`;

/** Gap between outfit segment row and grid — independent of StickyChrome padding. */
export const OUTFIT_GRID_GAP = "1rem";

/** Nav inset plus breathing room below the grid (mirrors the segment-to-grid gap). */
export const FLOATING_NAV_CLEARANCE =
  `calc(4.5rem + env(safe-area-inset-bottom) + ${FLOATING_NAV_IOS_LIFT} + 1rem)`;
