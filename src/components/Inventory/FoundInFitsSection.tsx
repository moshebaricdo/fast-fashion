"use client";

import { OutfitMosaicCard } from "@/components/Inventory/OutfitMosaicCard";
import type { Outfit } from "@/types/wardrobe";

interface FoundInFitsSectionProps {
  outfits: Outfit[];
}

export function FoundInFitsSection({ outfits }: FoundInFitsSectionProps) {
  if (outfits.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-off-black">Found in these fits</h2>
      <div className="-mx-4 mt-3 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3 pb-1 pe-4">
          {outfits.map((outfit) => (
            <OutfitMosaicCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      </div>
    </section>
  );
}
