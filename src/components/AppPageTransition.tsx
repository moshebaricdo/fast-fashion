"use client";

import { AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { isTabRoot } from "@/lib/navigation";

interface AppPageTransitionProps {
  children: ReactNode;
}

const TRANSITION_HOST =
  "relative flex min-h-dvh min-w-0 flex-1 flex-col";

/**
 * Persistent AnimatePresence host. template.tsx supplies the keyed motion
 * segment that remounts per navigation.
 */
export function AppPageTransition({ children }: AppPageTransitionProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isTab = isTabRoot(pathname);

  if (shouldReduceMotion || !isTab) {
    return <div className={TRANSITION_HOST}>{children}</div>;
  }

  return (
    <div className={TRANSITION_HOST}>
      <AnimatePresence initial={false} mode="sync">
        {children}
      </AnimatePresence>
    </div>
  );
}
