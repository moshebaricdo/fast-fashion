"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLayoutEffect, useRef, useState } from "react";
import { toolbarOutlineBorder } from "@/components/ui/toolbarStyles";
import type { Purpose } from "@/types/wardrobe";
import { PURPOSE_LABELS, PURPOSES } from "@/types/wardrobe";

const INDICATOR_SPRING = {
  type: "spring" as const,
  duration: 0.34,
  bounce: 0.16,
};

const REDUCED_MOTION = { duration: 0.12 };

interface PurposeSegmentedControlProps {
  value: Purpose;
  onChange: (purpose: Purpose) => void;
}

export function PurposeSegmentedControl({
  value,
  onChange,
}: PurposeSegmentedControlProps) {
  const shouldReduceMotion = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{
    x: number;
    width: number;
  } | null>(null);

  const activeIndex = PURPOSES.indexOf(value);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || activeIndex < 0) return;

    const update = () => {
      const activeSegment = segmentRefs.current[activeIndex];
      if (!activeSegment) return;
      setIndicator({
        x: activeSegment.offsetLeft,
        width: activeSegment.offsetWidth,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [activeIndex, value]);

  return (
    <div
      ref={trackRef}
      className={`h-8 w-full rounded-full bg-white p-0.5 ${toolbarOutlineBorder}`}
      role="tablist"
      aria-label="Outfit purpose"
    >
      <div ref={innerRef} className="relative flex h-full w-full min-w-0">
        {indicator && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 rounded-full bg-off-black"
            initial={false}
            animate={{
              x: indicator.x,
              width: indicator.width,
            }}
            transition={shouldReduceMotion ? REDUCED_MOTION : INDICATOR_SPRING}
          />
        )}

        {PURPOSES.map((option, index) => {
          const active = option === value;

          return (
            <button
              key={option}
              ref={(node) => {
                segmentRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option)}
              className={`relative z-10 flex min-w-0 flex-1 items-center justify-center truncate text-xs font-medium transition-colors duration-150 ease-out active:scale-[0.98] ${
                active ? "text-white" : "text-stone hover:text-off-black"
              }`}
            >
              {PURPOSE_LABELS[option]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
