"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const THRESHOLD = 72;
const MAX_PULL = 140;
const PULL_SLOP = 10;
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
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const activeRef = useRef(false);
  const pendingRef = useRef(false);

  const resetGesture = useCallback(() => {
    activeRef.current = false;
    pendingRef.current = false;
    setDragging(false);
  }, []);

  const finishGesture = useCallback(() => {
    const shouldDismiss = pull >= THRESHOLD;
    const didPull = activeRef.current && pull > PULL_SLOP;
    resetGesture();
    setPull(0);

    if (didPull) {
      const blockClick = (clickEvent: Event) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };
      document.addEventListener("click", blockClick, {
        capture: true,
        once: true,
      });
    }

    if (shouldDismiss) {
      onDismiss();
    }
  }, [onDismiss, pull, resetGesture]);

  const updatePull = useCallback((clientY: number) => {
    const delta = clientY - startYRef.current;
    if (delta <= 2) return;
    setPull(applyPullResistance(delta));
  }, []);

  const canStartPull = useCallback(() => {
    if (disabled || shouldReduceMotion) return false;
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, [disabled, shouldReduceMotion]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canStartPull() || event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label")) return;

    pendingRef.current = true;
    startYRef.current = event.clientY;
    startXRef.current = event.clientX;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const deltaY = event.clientY - startYRef.current;
    const deltaX = event.clientX - startXRef.current;

    if (pendingRef.current && !activeRef.current) {
      if (!canStartPull()) {
        pendingRef.current = false;
        return;
      }

      if (deltaY > PULL_SLOP && deltaY > Math.abs(deltaX)) {
        activeRef.current = true;
        pendingRef.current = false;
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePull(event.clientY);
      } else if (Math.abs(deltaX) > PULL_SLOP || deltaY < -PULL_SLOP) {
        pendingRef.current = false;
      }
      return;
    }

    if (
      !activeRef.current ||
      !event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      return;
    }

    if (deltaY > 0) {
      updatePull(event.clientY);
    }
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pendingRef.current && !activeRef.current) {
      pendingRef.current = false;
      return;
    }

    if (!activeRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishGesture();
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetGesture();
    setPull(0);
  };

  const pullProgress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
        animate={{ opacity: pull > PULL_SLOP ? pullProgress * 0.9 : 0 }}
        transition={dragging ? { duration: 0 } : SNAP_SPRING}
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
        transition={dragging ? { duration: 0 } : SNAP_SPRING}
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
