"use client";

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

/** Pins header chrome; compacts vertical padding slightly once the page scrolls. */
export function StickyChrome({
  children,
  className = "",
  transparentUntilScroll = true,
}: StickyChromeProps) {
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = resolveScrollTarget(rootRef.current);
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
  }, []);

  const backgroundClass = transparentUntilScroll
    ? scrolled
      ? "bg-background"
      : "bg-transparent"
    : "bg-background";

  return (
    <div
      ref={rootRef}
      className={`sticky top-0 z-30 transition-[padding,background-color] duration-200 ease-out ${backgroundClass} ${
        scrolled ? "pt-3 pb-3" : "pt-4 pb-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}
