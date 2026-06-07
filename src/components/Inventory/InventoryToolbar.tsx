"use client";

import { Filter, Plus, Search, X } from "@/components/icons";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FilterPanel } from "@/components/FilterBar/FilterPanel";
import { UploadStagingPopover } from "@/components/UploadStaging/UploadStagingPopover";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { toolbarOutlineInput, toolbarPopoverSurface } from "@/components/ui/toolbarStyles";
import type { InventoryFilters } from "@/types/wardrobe";

export interface UploadStagingSlot {
  open: boolean;
  locked: boolean;
  onClose: () => void;
  panel: ReactNode;
}

interface InventoryToolbarProps {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  onAddClick: () => void;
  uploadStaging?: UploadStagingSlot;
}

/** Strong ease-out — responsive start, soft settle, no overshoot past bounds */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const SEARCH_ENTER = {
  transform: { duration: 0.24, ease: EASE_OUT },
  opacity: { duration: 0.14, ease: EASE_OUT },
};

const SEARCH_EXIT = {
  transform: { duration: 0.17, ease: EASE_OUT },
  opacity: { duration: 0.1, ease: EASE_OUT },
};

const TITLE_ENTER = {
  opacity: { duration: 0.18, ease: EASE_OUT },
  transform: { duration: 0.22, ease: EASE_OUT },
};

const TITLE_EXIT = {
  opacity: { duration: 0.1, ease: EASE_OUT },
  transform: { duration: 0.16, ease: EASE_OUT },
};

const PANEL_ENTER = {
  opacity: { duration: 0.14, ease: EASE_OUT },
  transform: { duration: 0.22, ease: EASE_OUT },
};

const PANEL_EXIT = {
  opacity: { duration: 0.1, ease: EASE_OUT },
  transform: { duration: 0.16, ease: EASE_OUT },
};

const REDUCED = { duration: 0.1 };

const OPTICAL_ICON = { iconSize: 17, strokeWidth: 1.5 } as const;

type SearchPhase = "closed" | "open" | "closing";

function searchTransform(offset: number) {
  return `translate3d(${Math.round(offset)}px, 0, 0)`;
}

const titleVariants = {
  initial: { opacity: 0, transform: "translateX(-10px)" },
  animate: {
    opacity: 1,
    transform: "translateX(0px)",
    transition: TITLE_ENTER,
  },
  exit: {
    opacity: 0,
    transform: "translateX(-12px)",
    transition: TITLE_EXIT,
  },
};

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

export function InventoryToolbar({
  filters,
  onFiltersChange,
  onAddClick,
  uploadStaging,
}: InventoryToolbarProps) {
  const [searchPhase, setSearchPhase] = useState<SearchPhase>("closed");
  const [filterOpen, setFilterOpen] = useState(false);
  const [slideX, setSlideX] = useState(280);
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const filterAnchorRef = useRef<HTMLDivElement>(null);
  const addAnchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverOrigin, setPopoverOrigin] = useState("16px 0px");
  const shouldReduceMotion = useReducedMotion();

  const activeFilterCount = useMemo(
    () =>
      filters.categories.length +
      filters.colors.length +
      filters.purposes.length +
      filters.subcategories.length,
    [
      filters.categories.length,
      filters.colors.length,
      filters.purposes.length,
      filters.subcategories.length,
    ],
  );

  const searchOpen = searchPhase !== "closed";
  const isClosing = searchPhase === "closing";
  const searchTransition = shouldReduceMotion
    ? REDUCED
    : isClosing
      ? SEARCH_EXIT
      : SEARCH_ENTER;

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const update = () => {
      const width = slot.offsetWidth;
      if (width > 0) setSlideX(width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!filterOpen || !filterAnchorRef.current || !containerRef.current) return;

    const updateOrigin = () => {
      const filter = filterAnchorRef.current!.getBoundingClientRect();
      const container = containerRef.current!.getBoundingClientRect();
      const headerHeight = headerRef.current?.offsetHeight ?? 32;
      const popoverLeft = 16;
      const popoverTop = headerHeight + 8;
      const originX = filter.left + filter.width / 2 - container.left - popoverLeft;
      const originY = filter.bottom - container.top - popoverTop;
      setPopoverOrigin(`${Math.round(originX)}px ${Math.round(originY)}px`);
    };

    updateOrigin();
    window.addEventListener("resize", updateOrigin);
    return () => window.removeEventListener("resize", updateOrigin);
  }, [filterOpen, searchPhase]);

  const openSearch = () => setSearchPhase("open");

  const closeSearch = useCallback(() => {
    setFilterOpen(false);
    onFiltersChange({ ...filters, search: "" });
    setSearchPhase("closing");
  }, [filters, onFiltersChange]);

  const handleSearchAnimationComplete = () => {
    setSearchPhase((phase) => {
      if (phase === "closing") return "closed";
      if (phase === "open") {
        inputRef.current?.focus({ preventScroll: true });
      }
      return phase;
    });
  };

  const toggleFilter = () => {
    setFilterOpen((open) => !open);
  };

  useEffect(() => {
    if (uploadStaging?.open) setFilterOpen(false);
  }, [uploadStaging?.open]);

  useEffect(() => {
    if (!filterOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      setFilterOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [filterOpen]);

  const searchHidden = shouldReduceMotion
    ? { opacity: 0, transform: searchTransform(0) }
    : { opacity: 0, transform: searchTransform(slideX) };

  const searchShown = { opacity: 1, transform: "translate3d(0, 0, 0)" };

  return (
    <StickyChrome>
      <div ref={containerRef} className="relative px-4">
      <header ref={headerRef} className="flex h-8 items-center gap-2">
        <div
          ref={slotRef}
          className="flex h-8 min-w-0 flex-1 items-center overflow-hidden"
        >
          <AnimatePresence mode="wait" initial={false}>
            {searchPhase === "closed" ? (
              <motion.h1
                key="title"
                variants={
                  shouldReduceMotion
                    ? {
                        initial: { opacity: 0 },
                        animate: { opacity: 1, transition: REDUCED },
                        exit: { opacity: 0, transition: REDUCED },
                      }
                    : titleVariants
                }
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full w-full items-center truncate text-base font-semibold leading-none tracking-tight text-off-black"
              >
                Wardrobe
              </motion.h1>
            ) : (
              <motion.div
                key="search-group"
                className="flex h-8 w-full min-w-0 items-center gap-2"
                style={{ transformOrigin: "100% 50%" }}
                initial={searchHidden}
                animate={isClosing ? searchHidden : searchShown}
                transition={searchTransition}
                onAnimationComplete={handleSearchAnimationComplete}
              >
                <div ref={filterAnchorRef} className="shrink-0">
                  <ToolbarIconButton
                    label="Filter wardrobe"
                    icon={Filter}
                    onClick={toggleFilter}
                    variant="secondary"
                    active={filterOpen}
                    aria-expanded={filterOpen}
                    showDot={activeFilterCount > 0 && !filterOpen}
                    {...OPTICAL_ICON}
                  />
                </div>

                <input
                  ref={inputRef}
                  type="search"
                  value={filters.search}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, search: e.target.value })
                  }
                  placeholder="Search wardrobe…"
                  className={`h-8 min-w-0 flex-1 rounded-full px-3.5 text-sm leading-none text-off-black placeholder:text-stone ${toolbarOutlineInput}`}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ToolbarIconButton
          label={searchOpen ? "Close search" : "Search wardrobe"}
          icon={searchOpen ? X : Search}
          onClick={searchOpen ? closeSearch : openSearch}
          variant="secondary"
          {...(searchOpen ? {} : OPTICAL_ICON)}
        />
        <div ref={addAnchorRef} className="shrink-0">
          <ToolbarIconButton
            label="Add items"
            icon={Plus}
            onClick={onAddClick}
            variant="primary"
            strokeWidth={2}
            active={uploadStaging?.open}
            aria-expanded={uploadStaging?.open ?? false}
          />
        </div>
      </header>

      {uploadStaging && (
        <UploadStagingPopover
          open={uploadStaging.open}
          locked={uploadStaging.locked}
          onClose={uploadStaging.onClose}
          containerRef={containerRef}
          anchorRef={addAnchorRef}
        >
          {uploadStaging.panel}
        </UploadStagingPopover>
      )}

      <AnimatePresence>
        {searchPhase === "open" && filterOpen && (
          <motion.div
            key="filter-popover"
            className={`absolute left-4 right-4 top-[calc(100%+8px)] z-40 max-h-[min(60vh,420px)] overflow-y-auto ${toolbarPopoverSurface}`}
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
            <FilterPanel filters={filters} onChange={onFiltersChange} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </StickyChrome>
  );
}
