"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { useDrawerOverlayActive } from "@/contexts/DrawerNavigationContext";
import {
  drawerClosed,
  drawerOpen,
  DRAWER_SHEET_MS,
  EASE_SHEET,
} from "@/lib/motion";

/** Slide-up enter when the drawer page renders in the main slot (hard nav). */
export function DrawerPageShell({ children }: { children: ReactNode }) {
  const overlayActive = useDrawerOverlayActive();
  const shouldReduceMotion = useReducedMotion();

  if (overlayActive || shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.div
      className="flex min-h-full flex-1 flex-col"
      initial={drawerClosed}
      animate={drawerOpen}
      transition={{ duration: DRAWER_SHEET_MS / 1000, ease: EASE_SHEET }}
      style={{ willChange: "transform" }}
    >
      {children}
    </motion.div>
  );
}
