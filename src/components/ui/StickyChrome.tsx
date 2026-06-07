"use client";

import { usePageScroll } from "@/contexts/PageScrollContext";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface StickyChromeProps {
  children: ReactNode;
  className?: string;
  /** Opaque background only after scroll — keeps content visible under the chrome at rest. */
  transparentUntilScroll?: boolean;
}

function resolveScrollTarget(node: HTMLElement | null): HTMLElement | Window {
  let el = node?.parentElement ?? null;

  while (el) {
    const { overflowY, overflow } = getComputedStyle(el);
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflow === "auto" ||
      overflow === "scroll"
    ) {
      return el;
    }
    el = el.parentElement;
  }

  return window;
}

/** Pins header chrome above scrollable page content. */
export function StickyChrome({
  children,
  className = "",
  transparentUntilScroll = true,
}: StickyChromeProps) {
  const pageScroll = usePageScroll();
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!transparentUntilScroll) return;

    const target =
      pageScroll?.scrollRef.current ??
      resolveScrollTarget(rootRef.current);

    const update = () => {
      const offset =
        target === window
          ? window.scrollY
          : (target as HTMLElement).scrollTop;
      setScrolled(offset > 1);
    };

    update();
    target.addEventListener("scroll", update, { passive: true });
    return () => target.removeEventListener("scroll", update);
  }, [pageScroll, transparentUntilScroll]);

  const backgroundClass = transparentUntilScroll
    ? scrolled
      ? "bg-background"
      : "bg-transparent"
    : "bg-background";

  const positionClass = pageScroll?.pinned ? "" : "sticky top-0 z-30";

  return (
    <div
      ref={rootRef}
      className={`${positionClass} isolate [transform:translateZ(0)] py-[22px] transition-[background-color] duration-200 ease-out ${backgroundClass} ${className}`}
    >
      {children}
    </div>
  );
}
