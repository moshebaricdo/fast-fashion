/** Motion tokens — ease-out enters, custom curves, UI under ~300ms */

export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_SHEET = [0.32, 0.72, 0, 1] as const;

/** Tab crossfade — overlapping exit/enter */
export const TAB_EXIT_MS = 100;
export const TAB_ENTER_MS = 160;

/** Drawer sheet */
export const DRAWER_SHEET_MS = 240;

export const drawerOpen = {
  y: 0,
  scale: 1,
  opacity: 1,
} as const;

export const drawerClosed = {
  y: "100%",
  scale: 0.985,
  opacity: 1,
} as const;

export const listUnderlay = {
  opacity: 0.72,
} as const;

export const listRest = {
  opacity: 1,
} as const;

export const sheetTransition = {
  duration: DRAWER_SHEET_MS / 1000,
  ease: EASE_SHEET,
} as const;

export const tabExitTransition = {
  duration: TAB_EXIT_MS / 1000,
  ease: EASE_OUT,
} as const;

export const tabEnterTransition = {
  duration: TAB_ENTER_MS / 1000,
  ease: EASE_OUT,
} as const;

/** Floating nav tab ↔ item-action morph */
export const NAV_MORPH_MS = 180;

export const navMorphTransition = {
  duration: NAV_MORPH_MS / 1000,
  ease: EASE_OUT,
} as const;

export const navPillTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 32,
  mass: 0.75,
};
