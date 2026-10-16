"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shuffle } from "@/components/icons";
import { usePullGesture } from "@/lib/pullGesture";
import { useEffect, useState, type ReactNode } from "react";

import { FLOATING_NAV_CLEARANCE } from "@/lib/navLayout";

const THRESHOLD = 72;
const MAX_PULL = 112;
/** Wait until the pull gap clears the segment row before revealing the icon */
const ICON_REVEAL_AT = 44;
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
  const [thresholdPulse, setThresholdPulse] = useState(0);

  const { pull, dragging, rootRef, onPointerDown } = usePullGesture({
    enabled: pullEnabled,
    threshold: THRESHOLD,
    applyResistance: applyPullResistance,
    onTrigger: onShuffle,
    onThresholdCross: () => setThresholdPulse((value) => value + 1),
  });

  const revealPull = Math.max(0, pull - ICON_REVEAL_AT);
  const revealRange = THRESHOLD - ICON_REVEAL_AT;
  const iconProgress =
    revealRange > 0 ? Math.min(revealPull / revealRange, 1) : 0;
  const iconVisible = pull >= ICON_REVEAL_AT;
  const ready = pull >= THRESHOLD;

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
      ref={rootRef}
      className={`relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden overscroll-none ${
        dragging ? "touch-none" : "touch-pan-x"
      }`}
      onPointerDown={onPointerDown}
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
