"use client";

import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { FLOATING_NAV_INSET } from "@/lib/navLayout";

type PageScrollContextValue = {
  scrollRef: RefObject<HTMLElement | null>;
  /** Header sits outside the scroll container — no sticky positioning needed. */
  pinned: boolean;
};

const PageScrollContext = createContext<PageScrollContextValue | null>(null);

export function usePageScroll() {
  return useContext(PageScrollContext);
}

interface TabPageLayoutProps {
  header: ReactNode;
  children: ReactNode;
}

/**
 * Locks the page to the viewport and scrolls only the content region.
 * Keeps the header fixed while content rubber-bands independently on iOS.
 */
export function TabPageLayout({ header, children }: TabPageLayoutProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <PageScrollContext.Provider value={{ scrollRef, pinned: true }}>
      <div
        className="flex min-w-0 flex-col overflow-hidden overscroll-none"
        style={{
          height: "100dvh",
          maxHeight: "100dvh",
          marginBottom: `calc(-1 * (${FLOATING_NAV_INSET}))`,
        }}
      >
        <div className="relative z-30 shrink-0">{header}</div>
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
          style={{ paddingBottom: FLOATING_NAV_INSET }}
        >
          <div className="flex min-h-full flex-col">{children}</div>
        </div>
      </div>
    </PageScrollContext.Provider>
  );
}
