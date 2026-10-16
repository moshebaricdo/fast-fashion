"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isTabRoot } from "@/lib/navigation";
import { tabEnterTransition, tabExitTransition } from "@/lib/motion";

/**
 * Remounts on every navigation. The keyed motion segment pairs with
 * AnimatePresence in AppPageTransition so exit/enter can overlap.
 */
export default function Template({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isTab = isTabRoot(pathname);

  if (shouldReduceMotion || !isTab) {
    return (
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={pathname}
      layout={false}
      className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { opacity: tabEnterTransition, y: tabEnterTransition },
      }}
      exit={{
        opacity: 0,
        y: -4,
        transition: { opacity: tabExitTransition, y: tabExitTransition },
      }}
      style={{ willChange: "opacity, transform" }}
    >
      {children}
    </motion.div>
  );
}
