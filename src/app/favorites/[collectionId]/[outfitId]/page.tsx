"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "@/components/icons";
import { useParams, useRouter } from "next/navigation";

import { DrawerPageShell } from "@/components/DrawerPageShell";
import { DetailScreen } from "@/components/ui/DetailScreen";
import { InlineEditableTitle } from "@/components/ui/InlineEditableTitle";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { SquareImage } from "@/components/ui/SquareImage";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import {
  useDrawerDismiss,
  useDrawerOverlayActive,
} from "@/contexts/DrawerNavigationContext";
import { useItemDetailNav } from "@/contexts/FloatingNavContext";
import { OutfitSlotsGrid } from "@/components/OutfitSlotsGrid";
import { getOutfitItems } from "@/lib/favorites";
import { favoritesOutfitParent, inventoryItemHref, ROUTES } from "@/lib/navigation";
import {
  getCollectionById,
  getFavoriteOutfits,
  removeFromFavorites,
  updateOutfit,
} from "@/lib/storage";
import type { ClothingItem, Collection, Outfit } from "@/types/wardrobe";
import { SLOT_LABELS } from "@/types/wardrobe";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function ExpandedItem({
  item,
  slot,
  skipEnterMotion,
  returnPath,
}: {
  item?: ClothingItem;
  slot: "top" | "layer" | "bottom" | "shoe";
  skipEnterMotion: boolean;
  returnPath: string;
}) {
  return (
    <motion.article
      initial={skipEnterMotion ? false : { opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{
        duration: 0.2,
        ease: EASE_OUT,
      }}
      className="overflow-visible"
    >
      {item?.imageUrl ? (
        <Link
          href={inventoryItemHref(item.id, returnPath)}
          className="group block"
        >
          <SquareImage
            src={item.imageUrl}
            alt={item.name}
            rounded="2xl"
            className="grid-card-surface ring-1 ring-stone/10"
          />
        </Link>
      ) : (
        <div className="flex aspect-square items-center justify-center rounded-2xl bg-stone/8 text-sm text-stone/50 ring-1 ring-stone/10">
          {SLOT_LABELS[slot]} unavailable
        </div>
      )}
    </motion.article>
  );
}

export default function FavoriteOutfitDetailPage() {
  const params = useParams<{ collectionId: string; outfitId: string }>();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const overlayActive = useDrawerOverlayActive();
  const collectionId =
    typeof params.collectionId === "string" ? params.collectionId : "";
  const outfitId = typeof params.outfitId === "string" ? params.outfitId : "";
  const [collection, setCollection] = useState<Collection | null>(null);
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const dismiss = useDrawerDismiss(favoritesOutfitParent(collectionId));

  useEffect(() => {
    if (!collectionId || !outfitId) {
      router.replace("/favorites");
      return;
    }

    const foundCollection = getCollectionById(collectionId);
    if (!foundCollection) {
      router.replace("/favorites");
      return;
    }

    const foundOutfit =
      getFavoriteOutfits(collectionId).find((entry) => entry.id === outfitId) ??
      null;

    if (!foundOutfit) {
      router.replace(`/favorites/${collectionId}`);
      return;
    }

    setCollection(foundCollection);
    setOutfit(foundOutfit);
    setDraftName(foundOutfit.name);
  }, [collectionId, outfitId, router]);

  const requestClose = useCallback(() => {
    if (editing && outfit) {
      setEditing(false);
      setDraftName(outfit.name);
      return;
    }

    dismiss();
  }, [dismiss, editing, outfit]);

  const handleDelete = useCallback(() => {
    if (!outfit || isRemoving) return;
    if (!window.confirm("Remove this outfit from favorites?")) return;
    setIsRemoving(true);
    removeFromFavorites(outfit.id);
    window.setTimeout(() => dismiss(), shouldReduceMotion ? 0 : 180);
  }, [outfit, isRemoving, dismiss, shouldReduceMotion]);

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const commitName = useCallback(() => {
    if (!outfit) return;

    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(outfit.name);
      setEditing(false);
      return;
    }

    if (trimmed !== outfit.name) {
      const updated = updateOutfit(outfit.id, { name: trimmed });
      if (updated) {
        setOutfit(updated);
        setDraftName(updated.name);
      }
    }

    setEditing(false);
  }, [draftName, outfit]);

  const navActions = useMemo(
    () =>
      outfit
        ? {
            onEdit: handleEdit,
            onDelete: handleDelete,
          }
        : null,
    [outfit, handleEdit, handleDelete],
  );

  useItemDetailNav(navActions);

  if (!collection || !outfit) {
    return null;
  }

  const items = getOutfitItems(outfit);
  const hasLayer = Boolean(items.layer);
  const outfitReturnPath = ROUTES.outfit(collectionId, outfitId);

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
            <header className="mt-4">
              <InlineEditableTitle
                value={draftName}
                onChange={setDraftName}
                editing={editing}
                onCommit={commitName}
                autoFocus={editing}
                className="text-base font-semibold leading-none tracking-tight text-off-black"
              />
              <p className="mt-1 text-sm text-stone">
                Saved{" "}
                {new Date(outfit.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                {" · "}
                {collection.name}
              </p>
            </header>
          </div>
        </StickyChrome>

        <div className="px-4 pb-6 sm:px-6">
          <OutfitSlotsGrid
            hasLayer={hasLayer}
            slots={{
              top: (
                <ExpandedItem
                  item={items.top}
                  slot="top"
                  skipEnterMotion={shouldReduceMotion || overlayActive}
                  returnPath={outfitReturnPath}
                />
              ),
              layer: hasLayer ? (
                <ExpandedItem
                  item={items.layer}
                  slot="layer"
                  skipEnterMotion={shouldReduceMotion || overlayActive}
                  returnPath={outfitReturnPath}
                />
              ) : undefined,
              bottom: (
                <ExpandedItem
                  item={items.bottom}
                  slot="bottom"
                  skipEnterMotion={shouldReduceMotion || overlayActive}
                  returnPath={outfitReturnPath}
                />
              ),
              shoe: (
                <ExpandedItem
                  item={items.shoe}
                  slot="shoe"
                  skipEnterMotion={shouldReduceMotion || overlayActive}
                  returnPath={outfitReturnPath}
                />
              ),
            }}
          />
        </div>
      </DetailScreen>
    </DrawerPageShell>
  );
}
