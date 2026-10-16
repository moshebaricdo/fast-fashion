"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ArrowLeft, Check } from "@/components/icons";
import { DrawerPageShell } from "@/components/DrawerPageShell";
import { OutfitMosaicCard } from "@/components/Inventory/OutfitMosaicCard";
import { DetailScreen } from "@/components/ui/DetailScreen";
import { InlineEditableTitle } from "@/components/ui/InlineEditableTitle";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { useDrawerDismiss } from "@/contexts/DrawerNavigationContext";
import { useItemDetailNav } from "@/contexts/FloatingNavContext";
import { favoritesCollectionParent } from "@/lib/navigation";
import {
  deleteCollection,
  getCollectionById,
  getFavoriteOutfits,
  updateCollection,
} from "@/lib/storage";
import type { Collection, Outfit } from "@/types/wardrobe";

const HEADER_SAVE_BUTTON =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-off-black px-3.5 text-sm font-medium text-white transition-[transform,opacity] duration-150 hover:bg-off-black/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export default function FavoritesCollectionPage() {
  const params = useParams<{ collectionId: string }>();
  const router = useRouter();
  const collectionId =
    typeof params.collectionId === "string" ? params.collectionId : "";
  const [collection, setCollection] = useState<Collection | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const dismiss = useDrawerDismiss(favoritesCollectionParent(collectionId));

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
    setDraftName(found.name);
    setOutfits(getFavoriteOutfits(collectionId));
  }, [collectionId, router]);

  const requestClose = useCallback(() => {
    if (editing && collection) {
      setEditing(false);
      setDraftName(collection.name);
      return;
    }

    dismiss();
  }, [collection, dismiss, editing]);

  const handleDelete = useCallback(() => {
    if (!collection) return;
    if (!window.confirm("Delete this collection? Saved outfits will stay in your wardrobe.")) {
      return;
    }
    deleteCollection(collection.id);
    dismiss();
  }, [collection, dismiss]);

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    if (!collection) return;
    setEditing(false);
    setDraftName(collection.name);
  }, [collection]);

  const commitName = useCallback(() => {
    if (!collection) return;

    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(collection.name);
      setEditing(false);
      return;
    }

    if (trimmed !== collection.name) {
      const updated = updateCollection(collection.id, { name: trimmed });
      if (updated) {
        setCollection(updated);
        setDraftName(updated.name);
      }
    }

    setEditing(false);
  }, [collection, draftName]);

  const navActions = useMemo(
    () =>
      collection
        ? {
            onEdit: handleEdit,
            onDelete: handleDelete,
            editing,
            onCancel: handleCancelEdit,
          }
        : null,
    [collection, handleEdit, handleDelete, editing, handleCancelEdit],
  );

  useItemDetailNav(navActions);

  if (!collection) {
    return null;
  }

  return (
    <DrawerPageShell>
      <DetailScreen onDismiss={requestClose}>
        <StickyChrome className="shrink-0">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between gap-2">
              <ToolbarIconButton
                label="Back"
                icon={ArrowLeft}
                onClick={requestClose}
                variant="secondary"
              />
              <div className="flex h-8 min-w-[5.25rem] items-center justify-end">
                {editing ? (
                  <button
                    type="button"
                    onClick={commitName}
                    disabled={!draftName.trim()}
                    className={HEADER_SAVE_BUTTON}
                  >
                    <Check size={15} strokeWidth={2.25} />
                    Save
                  </button>
                ) : null}
              </div>
            </div>
            <header className="mt-4">
              <InlineEditableTitle
                value={draftName}
                onChange={setDraftName}
                editing={editing}
                autoFocus={editing}
                className="text-base font-semibold leading-none tracking-tight text-off-black"
              />
            </header>
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
