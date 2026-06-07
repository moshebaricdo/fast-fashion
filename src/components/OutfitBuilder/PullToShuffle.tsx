"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shuffle } from "@/components/icons";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import { FLOATING_NAV_CLEARANCE } from "@/lib/navLayout";

const THRESHOLD = 72;
const MAX_PULL = 112;
/** Wait until the pull gap clears the segment row before revealing the icon */
const ICON_REVEAL_AT = 44;
/** Vertical movement before pull steals the gesture from taps */
const PULL_SLOP = 10;
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SNAP_SPRING = { type: "spring" as const, duration: 0.34, bounce: 0.14 };

interface PullToShuffleProps {
  onShuffle: () => void;
  children: ReactNode;
}

function applyPullResistance(delta: number): number {
  if (delta <= 0) return 0;
  return Math.min(MAX_PULL, delta * 0.48);
}

/** Pull-to-shuffle is touch-first; desktop uses the toolbar shuffle button. */
function useMobilePullEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return enabled;
}

export function PullToShuffle({ onShuffle, children }: PullToShuffleProps) {
  const pullEnabled = useMobilePullEnabled();
  const shouldReduceMotion = useReducedMotion();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [thresholdPulse, setThresholdPulse] = useState(0);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const activeRef = useRef(false);
  const pendingRef = useRef(false);
  const crossedRef = useRef(false);

  const revealPull = Math.max(0, pull - ICON_REVEAL_AT);
  const revealRange = THRESHOLD - ICON_REVEAL_AT;
  const iconProgress =
    revealRange > 0 ? Math.min(revealPull / revealRange, 1) : 0;
  const iconVisible = pull >= ICON_REVEAL_AT;
  const ready = pull >= THRESHOLD;

  const resetGesture = useCallback(() => {
    activeRef.current = false;
    pendingRef.current = false;
    crossedRef.current = false;
    setDragging(false);
  }, []);

  const finishGesture = useCallback(() => {
    const shouldShuffle = pull >= THRESHOLD;
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

    if (shouldShuffle) {
      onShuffle();
    }
  }, [onShuffle, pull, resetGesture]);

  const updatePull = useCallback((clientY: number) => {
    const delta = clientY - startYRef.current;
    if (delta <= 2) return;

    const next = applyPullResistance(delta);
    setPull(next);

    if (next >= THRESHOLD && !crossedRef.current) {
      crossedRef.current = true;
      setThresholdPulse((value) => value + 1);
    }
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (shouldReduceMotion || event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("button, a")) return;

    pendingRef.current = true;
    crossedRef.current = false;
    startYRef.current = event.clientY;
    startXRef.current = event.clientX;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const deltaY = event.clientY - startYRef.current;
    const deltaX = event.clientX - startXRef.current;

    if (pendingRef.current && !activeRef.current) {
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

    if (!activeRef.current || !event.currentTarget.hasPointerCapture(event.pointerId)) {
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

  if (!pullEnabled) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col overflow-visible"
        style={{ paddingBottom: FLOATING_NAV_CLEARANCE }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className="relative z-0 flex min-h-0 flex-1 flex-col overflow-visible"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <motion.div
        aria-hidden={!iconVisible}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center"
        animate={{ height: pull }}
        transition={dragging ? { duration: 0 } : SNAP_SPRING}
      >
        {iconVisible ? (
          <motion.div
            key={thresholdPulse}
            initial={false}
            animate={
              shouldReduceMotion
                ? { opacity: ready ? 1 : iconProgress, scale: 1 }
                : thresholdPulse > 0
                  ? {
                      scale: [0.92, 1.14, 1],
                      rotate: [0, -14, 0],
                      opacity: 1,
                    }
                  : {
                      scale: 0.76 + iconProgress * 0.24,
                      opacity: iconProgress,
                    }
            }
            transition={
              thresholdPulse > 0
                ? { duration: 0.28, ease: EASE_OUT }
                : { duration: 0.12, ease: EASE_OUT }
            }
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 ease-out ${
              ready
                ? "bg-off-black text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                : "bg-stone/10 text-stone"
            }`}
          >
            <Shuffle size={17} strokeWidth={1.75} />
          </motion.div>
        ) : null}
      </motion.div>

      <motion.div
        className="flex min-h-0 flex-1 flex-col overflow-visible"
        style={{ paddingBottom: FLOATING_NAV_CLEARANCE }}
        animate={{ y: pull }}
        transition={dragging ? { duration: 0 } : SNAP_SPRING}
      >
        {children}
      </motion.div>
    </div>
  );
}
