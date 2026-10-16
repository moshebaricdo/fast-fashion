"use client";

import Image from "next/image";
import Link from "next/link";

import { OutfitSlotsGrid } from "@/components/OutfitSlotsGrid";
import { getOutfitMosaicSlots, type OutfitMosaicSlot } from "@/lib/favorites";
import { formatFilterLabel } from "@/lib/filterLabels";
import type { Outfit } from "@/types/wardrobe";

function MosaicCell({
  slot,
  fillHeight = false,
}: {
  slot: OutfitMosaicSlot;
  fillHeight?: boolean;
}) {
  return (
    <div
      className={`relative min-h-0 min-w-0 bg-stone/8 ${
        fillHeight ? "h-full" : "aspect-square"
      }`}
    >
      {slot.url ? (
        <Image
          src={slot.url}
          alt={slot.alt}
          fill
          sizes="(max-width: 768px) 50vw, 160px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-1">
          <span className="text-center text-[9px] font-medium leading-tight text-stone/50">
            {slot.alt}
          </span>
        </div>
      )}
    </div>
  );
}

interface OutfitMosaicCardProps {
  outfit: Outfit;
  layout?: "rail" | "grid";
}

export function OutfitMosaicCard({
  outfit,
  layout = "rail",
}: OutfitMosaicCardProps) {
  const slots = getOutfitMosaicSlots(outfit);
  const hasLayer = slots.length === 4;
  const href = outfit.collectionId
    ? `/favorites/${outfit.collectionId}/${outfit.id}`
    : "/favorites";

  const [top, layer, bottom, shoe] = hasLayer
    ? slots
    : [slots[0], undefined, slots[1], slots[2]];

  const stretchHeight = layout === "grid" && !hasLayer;

  return (
    <Link
      href={href}
      className={
        layout === "grid"
          ? "group block min-w-0 w-full"
          : "group block w-[132px] shrink-0 snap-start"
      }
      aria-label={outfit.name}
    >
      <div
        className={`grid-card-surface w-full overflow-hidden rounded-2xl bg-stone/15 ring-1 ring-stone/10 ${
          layout === "grid" ? "aspect-square" : ""
        }`}
      >
        <OutfitSlotsGrid
          hasLayer={hasLayer}
          variant="mosaic"
          mosaicFill={stretchHeight ? "height" : "square"}
          gapClass="gap-px"
          className={stretchHeight ? "h-full" : ""}
          slots={{
            top: <MosaicCell slot={top} fillHeight={stretchHeight} />,
            layer: layer ? (
              <MosaicCell slot={layer} fillHeight={stretchHeight} />
            ) : undefined,
            bottom: <MosaicCell slot={bottom} fillHeight={stretchHeight} />,
            shoe: <MosaicCell slot={shoe} fillHeight={stretchHeight} />,
          }}
        />
      </div>
      {layout === "rail" ? (
        <p className="mt-2 truncate text-xs font-medium text-off-black">
          {formatFilterLabel(outfit.name)}
        </p>
      ) : null}
    </Link>
  );
}
