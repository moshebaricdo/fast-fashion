import type { ReactNode } from "react";

export type OutfitSlotsGridSlots = {
  top: ReactNode;
  layer?: ReactNode;
  bottom: ReactNode;
  shoe: ReactNode;
};

export type OutfitSlotsGridVariant = "fit" | "mosaic";

interface OutfitSlotsGridProps {
  hasLayer: boolean;
  slots: OutfitSlotsGridSlots;
  /**
   * `fit` — homepage layout (stacked top on mobile, 3-across from md)
   * `mosaic` — uniform 3-across (collection thumbnails)
   */
  variant?: OutfitSlotsGridVariant;
  /** Mosaic 3-up: `square` card or `height` cells filling a taller card */
  mosaicFill?: "square" | "height";
  /** Tailwind gap utility, e.g. `gap-4` or `gap-px` */
  gapClass?: string;
  className?: string;
}

/**
 * Shared fit layout:
 * 3 items: see `variant`
 * 4 items: 2×2 grid
 */
export function OutfitSlotsGrid({
  hasLayer,
  slots,
  variant = "fit",
  mosaicFill = "square",
  gapClass = "gap-4",
  className = "",
}: OutfitSlotsGridProps) {
  if (hasLayer) {
    return (
      <div
        className={`grid w-full grid-cols-2 ${
          variant === "mosaic" ? "aspect-square" : ""
        } ${gapClass} ${className}`.trim()}
      >
        {slots.top}
        {slots.layer}
        {slots.bottom}
        {slots.shoe}
      </div>
    );
  }

  if (variant === "mosaic") {
    const mosaicSize =
      mosaicFill === "height" ? "h-full w-full" : "aspect-square w-full";

    return (
      <div
        className={`grid grid-cols-3 grid-rows-1 items-stretch ${mosaicSize} ${gapClass} ${className}`.trim()}
      >
        {slots.top}
        {slots.bottom}
        {slots.shoe}
      </div>
    );
  }

  return (
    <div
      className={`grid w-full grid-cols-2 md:grid-cols-3 ${gapClass} ${className}`.trim()}
    >
      <div className="col-span-2 min-w-0 md:col-span-1">{slots.top}</div>
      {slots.bottom}
      {slots.shoe}
    </div>
  );
}
