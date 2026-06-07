"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { toolbarOutlineInput } from "@/components/ui/toolbarStyles";

interface PageToolbarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  below?: ReactNode;
  searchExpanded?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

const titleClass =
  "flex h-full w-full items-center truncate text-base font-semibold leading-none tracking-tight text-off-black";

export function PageToolbar({
  title,
  left,
  right,
  below,
  searchExpanded = false,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search…",
}: PageToolbarProps) {
  return (
    <StickyChrome className="shrink-0">
      <header className={`px-4 ${below ? "space-y-3.5" : ""}`}>
      <div className="flex h-8 items-center gap-2">
        {left ? (
          <div className="flex h-8 shrink-0 items-center">{left}</div>
        ) : null}

        <div className="flex h-8 min-w-0 flex-1 items-center justify-start">
          <AnimatePresence mode="wait">
            {searchExpanded ? (
              <motion.input
                key="search"
                type="search"
                autoFocus
                initial={{ opacity: 0, transform: "translateX(8px)" }}
                animate={{ opacity: 1, transform: "translateX(0)" }}
                exit={{ opacity: 0, transform: "translateX(8px)" }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className={`h-8 w-full rounded-full px-3.5 text-sm leading-none text-off-black placeholder:text-stone ${toolbarOutlineInput}`}
              />
            ) : (
              <motion.h1
                key="title"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={titleClass}
              >
                {title}
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        {right ? (
          <div className="flex h-8 shrink-0 items-center justify-end gap-2">
            {right}
          </div>
        ) : null}
      </div>

      {below}
      </header>
    </StickyChrome>
  );
}
