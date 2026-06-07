"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePullGesture } from "@/lib/pullGesture";
import { useCallback, useRef, type ReactNode } from "react";

const THRESHOLD = 72;
const MAX_PULL = 140;
const SNAP_SPRING = { type: "spring" as const, duration: 0.34, bounce: 0.14 };

function applyPullResistance(delta: number): number {
  if (delta <= 0) return 0;
  return Math.min(MAX_PULL, delta * 0.52);
}

interface PullToDismissProps {
  onDismiss: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function PullToDismiss({
  onDismiss,
  children,
  disabled = false,
}: PullToDismissProps) {
  const shouldReduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const canStart = useCallback(() => {
    if (disabled) return false;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, [disabled]);

  const { pull, dragging, rootRef, onPointerDown } = usePullGesture({
    enabled: !disabled,
    threshold: THRESHOLD,
    applyResistance: applyPullResistance,
    onTrigger: onDismiss,
    canStart,
  });

  const pullProgress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      ref={rootRef}
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none ${
        dragging ? "touch-none" : ""
      }`}
      onPointerDown={onPointerDown}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
        animate={{ opacity: pull > 10 ? pullProgress * 0.9 : 0 }}
        transition={dragging || shouldReduceMotion ? { duration: 0 } : SNAP_SPRING}
      >
        <span
          className={`h-1 rounded-full bg-stone/35 transition-[width,background-color] duration-150 ${
            pull >= THRESHOLD ? "w-10 bg-stone/55" : "w-7"
          }`}
        />
      </motion.div>

      <motion.div
        className="flex min-h-0 flex-1 flex-col"
        animate={{ y: pull }}
        transition={dragging || shouldReduceMotion ? { duration: 0 } : SNAP_SPRING}
      >
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
