"use client";

import Image from "next/image";

import type { OutfitMosaicSlot } from "@/lib/favorites";

function MosaicCell({ slot }: { slot: OutfitMosaicSlot }) {
  return (
    <div className="relative h-full min-h-0 min-w-0 bg-stone/8">
      {slot.url ? (
        <Image
          src={slot.url}
          alt={slot.alt}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="h-full w-full bg-stone/8" />
      )}
    </div>
  );
}

interface CollectionPreviewMosaicProps {
  slots: OutfitMosaicSlot[];
  className?: string;
}

export function CollectionPreviewMosaic({
  slots,
  className = "",
}: CollectionPreviewMosaicProps) {
  return (
    <div
      className={`grid aspect-square grid-cols-2 grid-rows-2 gap-px overflow-hidden rounded-2xl bg-stone/15 ring-1 ring-stone/10 ${className}`}
    >
      {slots.map((slot, index) => (
        <MosaicCell key={`${slot.alt}-${index}`} slot={slot} />
      ))}
    </div>
  );
}
