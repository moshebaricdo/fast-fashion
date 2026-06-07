"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ArrowLeft } from "@/components/icons";
import { DrawerPageShell } from "@/components/DrawerPageShell";
import { OutfitMosaicCard } from "@/components/Inventory/OutfitMosaicCard";
import { DetailScreen } from "@/components/ui/DetailScreen";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { useDrawerDismiss } from "@/contexts/DrawerNavigationContext";
import { favoritesCollectionParent } from "@/lib/navigation";
import { getCollectionById, getFavoriteOutfits } from "@/lib/storage";
import type { Collection, Outfit } from "@/types/wardrobe";

export default function FavoritesCollectionPage() {
  const params = useParams<{ collectionId: string }>();
  const router = useRouter();
  const collectionId =
    typeof params.collectionId === "string" ? params.collectionId : "";
  const [collection, setCollection] = useState<Collection | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const dismiss = useDrawerDismiss(favoritesCollectionParent(collectionId));

  const requestClose = useCallback(() => {
    dismiss();
  }, [dismiss]);

  useEffect(() => {
    if (!collectionId) {
      router.replace("/favorites");
      return;
    }

    const found = getCollectionById(collectionId);
    if (!found) {
      router.replace("/favorites");
      return;
    }

    setCollection(found);
    setOutfits(getFavoriteOutfits(collectionId));
  }, [collectionId, router]);

  if (!collection) {
    return null;
  }

  return (
    <DrawerPageShell>
      <DetailScreen onDismiss={requestClose}>
        <StickyChrome className="shrink-0">
          <div className="px-4 sm:px-6">
            <ToolbarIconButton
              label="Back"
              icon={ArrowLeft}
              onClick={requestClose}
              variant="secondary"
            />
            <h1 className="mt-4 text-base font-semibold leading-none tracking-tight text-off-black">
              {collection.name}
            </h1>
          </div>
        </StickyChrome>

        <div className="px-4 pb-6 sm:px-6">
          {outfits.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone">
              Save a look from Today&apos;s Fit to add it here.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {outfits.map((outfit) => (
                <OutfitMosaicCard key={outfit.id} outfit={outfit} layout="grid" />
              ))}
            </div>
          )}
        </div>
      </DetailScreen>
    </DrawerPageShell>
  );
}
