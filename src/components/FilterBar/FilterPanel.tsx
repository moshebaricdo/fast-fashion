"use client";

import { X } from "@/components/icons";
import {
  CategoryPicker,
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
import { SUBCATEGORIES_BY_CATEGORY } from "@/types/wardrobe";

interface FilterPanelProps {
  filters: InventoryFilters;
  onChange: (filters: InventoryFilters) => void;
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const set = (patch: Partial<InventoryFilters>) =>
    onChange({ ...filters, ...patch });

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.colors.length > 0 ||
    filters.purposes.length > 0 ||
    filters.subcategories.length > 0;

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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-off-black">Category</p>
        <CategoryPicker
          filters={filters}
          onCategoryToggle={handleCategoryToggle}
        />
      </div>

      {filters.categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-off-black">Subcategory</p>
          <SubcategoryPicker
            filters={filters}
            onChange={(subcategories) => set({ subcategories })}
          />
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-off-black">Color</p>
        <ColorGroupPicker
          selected={filters.colors}
          onChange={(colors) => set({ colors })}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-off-black">Purpose</p>
        <PurposePicker
          selected={filters.purposes}
          onChange={(purposes) => set({ purposes })}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              categories: [],
              colors: [],
              purposes: [],
              subcategories: [],
            })
          }
          className="inline-flex items-center gap-1 text-sm text-stone underline decoration-stone/40 underline-offset-4 transition-colors duration-150 hover:text-off-black"
        >
          <X size={14} strokeWidth={1.75} />
          Clear filters
        </button>
      )}
    </div>
  );
}
