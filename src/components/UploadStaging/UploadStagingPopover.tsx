"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useState } from "react";
const uploadPopoverSurface =
  "rounded-2xl border border-stone/15 bg-white px-4 pt-4 pb-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)]";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const PANEL_ENTER = {
  opacity: { duration: 0.14, ease: EASE_OUT },
  transform: { duration: 0.22, ease: EASE_OUT },
};

const PANEL_EXIT = {
  opacity: { duration: 0.1, ease: EASE_OUT },
  transform: { duration: 0.16, ease: EASE_OUT },
};

const REDUCED = { duration: 0.1 };

function panelVariants(origin: string) {
  return {
    initial: {
      opacity: 0,
      transform: "scale(0.94)",
      transformOrigin: origin,
    },
    animate: {
      opacity: 1,
      transform: "scale(1)",
      transformOrigin: origin,
      transition: PANEL_ENTER,
    },
    exit: {
      opacity: 0,
      transform: "scale(0.97)",
      transformOrigin: origin,
      transition: PANEL_EXIT,
    },
  };
}

export interface UploadStagingPopoverProps {
  open: boolean;
  locked: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLElement | null>;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Distance from container top to popover top — defaults to header + 8px gap */
  topOffset?: number;
  children: React.ReactNode;
}

export function UploadStagingPopover({
  open,
  locked,
  onClose,
  containerRef,
  anchorRef,
  topOffset,
  children,
}: UploadStagingPopoverProps) {
  const shouldReduceMotion = useReducedMotion();
  const [popoverOrigin, setPopoverOrigin] = useState("right 0px");

  useLayoutEffect(() => {
    if (!open || !containerRef.current || !anchorRef.current) return;

    const updateOrigin = () => {
      const container = containerRef.current!.getBoundingClientRect();
      const anchor = anchorRef.current!.getBoundingClientRect();
      const popoverLeft = 16;
      const offset = topOffset ?? 40;
      const originX =
        anchor.left + anchor.width / 2 - container.left - popoverLeft;
      const originY = anchor.bottom - container.top - offset;
      setPopoverOrigin(`${Math.round(originX)}px ${Math.round(originY)}px`);
    };

    updateOrigin();
    window.addEventListener("resize", updateOrigin);
    return () => window.removeEventListener("resize", updateOrigin);
  }, [open, anchorRef, containerRef, topOffset]);

  useEffect(() => {
    if (!open || locked) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, locked, onClose, containerRef]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="upload-staging-popover"
          style={topOffset !== undefined ? { top: topOffset } : undefined}
          className={`absolute left-4 right-4 z-40 max-h-[min(60vh,420px)] overflow-y-auto ${
            topOffset === undefined ? "top-[calc(100%+8px)]" : ""
          } ${uploadPopoverSurface}`}
          variants={
            shouldReduceMotion
              ? {
                  initial: { opacity: 0 },
                  animate: { opacity: 1, transition: REDUCED },
                  exit: { opacity: 0, transition: REDUCED },
                }
              : panelVariants(popoverOrigin)
          }
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
