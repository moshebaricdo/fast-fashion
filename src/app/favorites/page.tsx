"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Plus, Heart, Shirt } from "@/components/icons";
import { WardrobeEmptyState } from "@/components/EmptyState/WardrobeEmptyState";
import { useUploadItemsFlow } from "@/hooks/useUploadItemsFlow";
import { CollectionCard } from "@/components/Favorites/CollectionCard";
import { SaveToCollectionPanel } from "@/components/Favorites/SaveToCollectionPanel";
import { UploadStagingPopover } from "@/components/UploadStaging/UploadStagingPopover";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { toolbarPopoverSurface } from "@/components/ui/toolbarStyles";
import { createCollection, getCollections, getFavoriteOutfits, getItems } from "@/lib/storage";
import type { Collection, Outfit } from "@/types/wardrobe";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const PANEL_ENTER = {
  opacity: { duration: 0.14, ease: EASE_OUT },
  transform: { duration: 0.22, ease: EASE_OUT },
};

const PANEL_EXIT = {
  opacity: { duration: 0.1, ease: EASE_OUT },
  transform: { duration: 0.16, ease: EASE_OUT },
};

const REDUCED = { duration: 0.1 };

function panelVariants(origin: string) {
  return {
    initial: {
      opacity: 0,
      transform: "scale(0.94)",
      transformOrigin: origin,
    },
    animate: {
      opacity: 1,
      transform: "scale(1)",
      transformOrigin: origin,
      transition: PANEL_ENTER,
    },
    exit: {
      opacity: 0,
      transform: "scale(0.97)",
      transformOrigin: origin,
      transition: PANEL_EXIT,
    },
  };
}

export default function FavoritesPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [outfitsByCollection, setOutfitsByCollection] = useState<
    Record<string, Outfit[]>
  >({});
  const [wardrobeCount, setWardrobeCount] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const createAnchorRef = useRef<HTMLDivElement>(null);
  const uploadAnchorRef = useRef<HTMLDivElement>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const [popoverOrigin, setPopoverOrigin] = useState("right 0px");
  const shouldReduceMotion = useReducedMotion();

  const refresh = useCallback(() => {
    const nextCollections = getCollections();
    const nextOutfits = Object.fromEntries(
      nextCollections.map((collection) => [
        collection.id,
        getFavoriteOutfits(collection.id),
      ]),
    ) as Record<string, Outfit[]>;

    setCollections(nextCollections);
    setOutfitsByCollection(nextOutfits);
    setWardrobeCount(getItems().length);
  }, []);

  const upload = useUploadItemsFlow(refresh);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useLayoutEffect(() => {
    if (!createOpen || !toolbarRef.current || !createAnchorRef.current) return;

    const updatePosition = () => {
      const container = toolbarRef.current!;
      const anchor = createAnchorRef.current!;
      const containerRect = container.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const top = Math.round(anchorRect.bottom - containerRect.top + 8);
      const originX =
        anchorRect.left + anchorRect.width / 2 - containerRect.left - 16;
      const originY = anchorRect.bottom - containerRect.top - top;

      setPopoverTop(top);
      setPopoverOrigin(`${Math.round(originX)}px ${Math.round(originY)}px`);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [createOpen]);

  useEffect(() => {
    if (upload.stagingOpen) setCreateOpen(false);
  }, [upload.stagingOpen]);

  useEffect(() => {
    if (!createOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      setCreateOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [createOpen]);

  const handleCreateCollection = useCallback(
    (name: string) => {
      createCollection(name);
      refresh();
      setCreateOpen(false);
    },
    [refresh],
  );

  const openCreate = useCallback(() => {
    refresh();
    setCreateOpen(true);
  }, [refresh]);

  return (
    <div className="min-w-0 pb-24">
      <div ref={toolbarRef} className="relative">
        <PageToolbar
          title="Collections"
          right={
            <div ref={createAnchorRef} className="shrink-0">
              <ToolbarIconButton
                label="Create collection"
                icon={Plus}
                onClick={() => setCreateOpen((open) => !open)}
                variant="primary"
                active={createOpen}
                aria-expanded={createOpen}
                strokeWidth={2}
              />
            </div>
          }
        />

        <div
          ref={uploadAnchorRef}
          className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-px -translate-x-1/2"
          aria-hidden="true"
        />

        <UploadStagingPopover
          open={upload.stagingOpen}
          locked={upload.stagingLocked}
          onClose={upload.closeStaging}
          containerRef={toolbarRef}
          anchorRef={uploadAnchorRef}
        >
          {upload.stagingPanel}
        </UploadStagingPopover>

        <AnimatePresence>
          {createOpen && (
            <motion.div
              key="create-collection-popover"
              style={{ top: popoverTop }}
              className={`absolute left-4 right-4 z-40 ${toolbarPopoverSurface}`}
              variants={
                shouldReduceMotion
                  ? {
                      initial: { opacity: 0 },
                      animate: { opacity: 1, transition: REDUCED },
                      exit: { opacity: 0, transition: REDUCED },
                    }
                  : panelVariants(popoverOrigin)
              }
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <SaveToCollectionPanel
                collections={collections}
                onSelectCollection={() => {}}
                onCreateCollection={handleCreateCollection}
                createOnly
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {wardrobeCount === 0 ? (
        <WardrobeEmptyState
          icon={Shirt}
          description="Add items to your wardrobe before saving outfits to collections."
          onAction={upload.openFilePicker}
        />
      ) : collections.length === 0 ? (
        <WardrobeEmptyState
          icon={Heart}
          description="Create your first collection to save outfits from Today's Fit."
          actionLabel="Create collection"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-4 md:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              outfits={outfitsByCollection[collection.id] ?? []}
            />
          ))}
        </div>
      )}

      {upload.fileInput}
    </div>
  );
}
