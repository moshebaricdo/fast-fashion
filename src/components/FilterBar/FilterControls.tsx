"use client";

import type { LucideIcon } from "lucide-react";
import { Shirt, SportShoe, Trousers } from "@/components/icons";
import { Chip } from "@/components/ui/Chip";
import {
  COLOR_GROUPS,
  formatFilterLabel,
  isColorGroupActive,
  toggleColorGroup,
} from "@/lib/filterLabels";
import type {
  Category,
  Color,
  InventoryFilters,
  Purpose,
  Subcategory,
} from "@/types/wardrobe";
import {
  CATEGORIES,
  PURPOSE_LABELS,
  PURPOSES,
  SLOT_LABELS,
  SUBCATEGORIES_BY_CATEGORY,
} from "@/types/wardrobe";
import { useMemo, Fragment, type ComponentType } from "react";
import type { LucideProps } from "lucide-react";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

const CATEGORY_ICONS: Record<Category, ComponentType<LucideProps>> = {
  top: Shirt,
  bottom: Trousers,
  shoe: SportShoe,
};

interface CategoryPickerProps {
  filters: InventoryFilters;
  onCategoryToggle: (value: Category) => void;
}

export function CategoryPicker({
  filters,
  onCategoryToggle,
}: CategoryPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {CATEGORIES.map((value) => {
        const active = filters.categories.includes(value);
        const CategoryIcon = CATEGORY_ICONS[value];

        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onCategoryToggle(value)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out active:scale-[0.97] ${
              active
                ? "border-off-black bg-off-black text-white shadow-sm"
                : "border-stone/20 bg-white text-off-black hover:border-mushroom/50 hover:bg-background"
            }`}
          >
            <CategoryIcon
              size={18}
              strokeWidth={1.5}
              className={active ? "text-white" : "text-stone"}
            />
            <span className="text-xs font-medium leading-none">
              {SLOT_LABELS[value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const FILTER_CHIP_CLASS = "h-9 py-0";
const FILTER_ROW_GAP = "gap-1.5";

interface ColorGroupPickerProps {
  selected: Color[];
  onChange: (colors: Color[]) => void;
}

export function ColorGroupPicker({ selected, onChange }: ColorGroupPickerProps) {
  return (
    <div className={`flex flex-wrap items-center ${FILTER_ROW_GAP}`}>
      {COLOR_GROUPS.map((group) => {
        const active = isColorGroupActive(selected, group.colors);

        return (
          <button
            key={group.id}
            type="button"
            title={group.label}
            aria-label={`Filter by ${group.label}`}
            aria-pressed={active}
            onClick={() => onChange(toggleColorGroup(selected, group.colors))}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-[0.92]"
          >
            <span
              className={`h-7 w-7 rounded-full border transition-[box-shadow,transform] duration-150 ${
                group.needsRing ? "border-stone/30" : "border-transparent"
              } ${active ? "scale-110 ring-2 ring-off-black ring-offset-1 ring-offset-white" : "hover:scale-105"}`}
              style={{ backgroundColor: group.swatch }}
            />
          </button>
        );
      })}
    </div>
  );
}

interface PurposePickerProps {
  selected: Purpose[];
  onChange: (purposes: Purpose[]) => void;
}

export function PurposePicker({ selected, onChange }: PurposePickerProps) {
  return (
    <div className={`flex flex-wrap items-center ${FILTER_ROW_GAP}`}>
      {PURPOSES.map((value) => (
        <Chip
          key={value}
          size="sm"
          variant="accent"
          active={selected.includes(value)}
          onClick={() => onChange(toggle(selected, value))}
          className={FILTER_CHIP_CLASS}
        >
          {PURPOSE_LABELS[value]}
        </Chip>
      ))}
    </div>
  );
}

interface SubcategoryPickerProps {
  filters: InventoryFilters;
  onChange: (subcategories: Subcategory[]) => void;
}

export function SubcategoryPicker({
  filters,
  onChange,
}: SubcategoryPickerProps) {
  const groupedSubcategories = useMemo(() => {
    return CATEGORIES.filter((category) =>
      filters.categories.includes(category),
    ).map((category) => ({
      category,
      subs: SUBCATEGORIES_BY_CATEGORY[category],
    }));
  }, [filters.categories]);

  if (groupedSubcategories.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center ${FILTER_ROW_GAP}`}>
      {groupedSubcategories.map(({ category, subs }, groupIndex) => (
        <Fragment key={category}>
          {groupIndex > 0 ? (
            <span
              aria-hidden
              className="mx-0.5 h-1.5 w-px shrink-0 self-center bg-border"
            />
          ) : null}
          {subs.map((sub) => (
            <Chip
              key={sub}
              size="sm"
              active={filters.subcategories.includes(sub)}
              onClick={() => onChange(toggle(filters.subcategories, sub))}
              className={`${FILTER_CHIP_CLASS} whitespace-nowrap`}
            >
              {formatFilterLabel(sub)}
            </Chip>
          ))}
        </Fragment>
      ))}
    </div>
  );
}

export { toggle };
