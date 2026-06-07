import type { Color } from "@/types/wardrobe";
import { COLOR_SWATCHES } from "@/types/wardrobe";

/** Title-case each word — "camp collar shirt" → "Camp Collar Shirt" */
export function formatFilterLabel(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => {
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export type ColorGroup = {
  id: string;
  label: string;
  colors: Color[];
  swatch: string;
  needsRing?: boolean;
};

export const COLOR_GROUPS: ColorGroup[] = [
  {
    id: "black",
    label: "Black",
    colors: ["black"],
    swatch: COLOR_SWATCHES.black,
  },
  {
    id: "brown",
    label: "Brown",
    colors: ["brown", "taupe"],
    swatch: COLOR_SWATCHES.brown,
  },
  {
    id: "green",
    label: "Green",
    colors: ["green", "olive", "sage"],
    swatch: COLOR_SWATCHES.green,
  },
  {
    id: "gray",
    label: "Gray",
    colors: ["gray", "stone", "mushroom"],
    swatch: COLOR_SWATCHES.gray,
  },
  {
    id: "cream",
    label: "Cream",
    colors: ["cream", "white", "beige"],
    swatch: COLOR_SWATCHES.cream,
    needsRing: true,
  },
  {
    id: "blue",
    label: "Blue",
    colors: ["blue"],
    swatch: COLOR_SWATCHES.blue,
  },
  {
    id: "other",
    label: "Other",
    colors: ["other"],
    swatch: COLOR_SWATCHES.other,
  },
];

export function isColorGroupActive(
  selected: Color[],
  groupColors: Color[],
): boolean {
  return groupColors.every((color) => selected.includes(color));
}

export function toggleColorGroup(
  selected: Color[],
  groupColors: Color[],
): Color[] {
  if (isColorGroupActive(selected, groupColors)) {
    return selected.filter((color) => !groupColors.includes(color));
  }
  const next = new Set(selected);
  groupColors.forEach((color) => next.add(color));
  return Array.from(next);
}
