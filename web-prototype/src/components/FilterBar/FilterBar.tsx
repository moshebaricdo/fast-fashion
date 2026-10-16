"use client";

import { ChevronDown, ChevronUp, Filter, X } from "@/components/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import {
  ColorGroupPicker,
  PurposePicker,
  SubcategoryPicker,
  toggle,
} from "@/components/FilterBar/FilterControls";
import type {
  Category,
  InventoryFilters,
  Subcategory,
} from "@/types/wardrobe";
import { CATEGORIES, SLOT_LABELS, SUBCATEGORIES_BY_CATEGORY } from "@/types/wardrobe";

interface FilterBarProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const set = (patch: Partial<InventoryFilters>) =>
    onChange({ ...filters, ...patch });

  const secondaryFilterCount = useMemo(
    () =>
      filters.colors.length +
      filters.purposes.length +
      filters.subcategories.length,
    [filters.colors.length, filters.purposes.length, filters.subcategories.length],
  );

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.colors.length > 0 ||
    filters.purposes.length > 0 ||
    filters.subcategories.length > 0 ||
    filters.search.length > 0;

  const handleCategoryToggle = (value: Category) => {
    const nextCategories = toggle(filters.categories, value);
    const validSubs = new Set<Subcategory>();
    nextCategories.forEach((category) => {
      SUBCATEGORIES_BY_CATEGORY[category].forEach((sub) => validSubs.add(sub));
    });
    const nextSubcategories = filters.subcategories.filter((sub) =>
      validSubs.has(sub),
    );
    set({ categories: nextCategories, subcategories: nextSubcategories });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((value) => (
          <Chip
            key={value}
            active={filters.categories.includes(value)}
            onClick={() => handleCategoryToggle(value)}
          >
            {SLOT_LABELS[value]}
          </Chip>
        ))}

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.97] ${
            expanded || secondaryFilterCount > 0
              ? "border-olive/40 bg-olive/10 text-espresso"
              : "border-stone/25 bg-white/70 text-off-black hover:border-mushroom"
          }`}
        >
          <Filter size={15} strokeWidth={1.75} />
          Filters
          {secondaryFilterCount > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso px-1 text-[11px] font-medium text-cream">
              {secondaryFilterCount}
            </span>
          ) : null}
          {expanded ? (
            <ChevronUp size={14} strokeWidth={1.75} />
          ) : (
            <ChevronDown size={14} strokeWidth={1.75} />
          )}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-2xl border border-stone/20 bg-white/40 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-espresso">Color</p>
                <ColorGroupPicker
                  selected={filters.colors}
                  onChange={(colors) => set({ colors })}
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-espresso">Purpose</p>
                <PurposePicker
                  selected={filters.purposes}
                  onChange={(purposes) => set({ purposes })}
                />
              </div>

              {filters.categories.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-espresso">Subcategory</p>
                  <SubcategoryPicker
                    filters={filters}
                    onChange={(subcategories) => set({ subcategories })}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({
              search: "",
              categories: [],
              colors: [],
              purposes: [],
              subcategories: [],
            })
          }
          className="inline-flex items-center gap-1 text-sm text-taupe underline decoration-stone/50 underline-offset-4 transition-colors duration-150 hover:text-espresso"
        >
          <X size={14} strokeWidth={1.75} />
          Clear all filters
        </button>
      )}
    </div>
  );
}
