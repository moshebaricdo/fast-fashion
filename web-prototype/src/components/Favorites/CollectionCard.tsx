"use client";

import Link from "next/link";

import { CollectionPreviewMosaic } from "@/components/Favorites/CollectionPreviewMosaic";
import { getCollectionPreviewSlots } from "@/lib/favorites";
import type { Collection, Outfit } from "@/types/wardrobe";

interface CollectionCardProps {
  collection: Collection;
  outfits: Outfit[];
}

export function CollectionCard({ collection, outfits }: CollectionCardProps) {
  const previewSlots =
    outfits.length > 0
      ? getCollectionPreviewSlots(outfits, collection.id)
      : null;

  return (
    <Link href={`/favorites/${collection.id}`} className="group block">
      {previewSlots ? (
        <CollectionPreviewMosaic
          slots={previewSlots}
          className="grid-card-surface"
        />
      ) : (
        <div className="grid-card-surface flex aspect-square items-center justify-center rounded-2xl bg-stone/8 ring-1 ring-stone/10">
          <span className="text-sm text-stone/50">Empty</span>
        </div>
      )}

      <div className="mt-2.5 px-0.5">
        <h2 className="text-[15px] font-semibold text-off-black">
          {collection.name}
        </h2>
      </div>
    </Link>
  );
}
