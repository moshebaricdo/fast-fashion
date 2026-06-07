"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, HeartFilled, Shuffle } from "@/components/icons";
import { WardrobeEmptyState } from "@/components/EmptyState/WardrobeEmptyState";
import { useUploadItemsFlow } from "@/hooks/useUploadItemsFlow";
import { SaveToCollectionPanel } from "@/components/Favorites/SaveToCollectionPanel";
import { UploadStagingPopover } from "@/components/UploadStaging/UploadStagingPopover";
import { OutfitPanel } from "@/components/OutfitBuilder/OutfitPanel";
import { PullToShuffle } from "@/components/OutfitBuilder/PullToShuffle";
import { PageToolbar } from "@/components/ui/PageToolbar";
import { PurposeSegmentedControl } from "@/components/ui/PurposeSegmentedControl";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { toolbarPopoverSurface } from "@/components/ui/toolbarStyles";
import {
  getLastDailyPurpose,
  getOrCreateDailyOutfit,
  persistDailyOutfit,
  setLastDailyPurpose,
} from "@/lib/dailyOotd";
import {
  createCollection,
  getCollections,
  getItems,
  removeFromFavorites,
  saveOutfit,
} from "@/lib/storage";
import {
  areItemsCompatible,
  shuffleFullOutfit,
  shuffleSlot,
} from "@/lib/shuffleOutfit";
import type {
  ClothingItem,
  Collection,
  OutfitDraft,
  OutfitSlots,
  Purpose,
  ShuffledOutfit,
  SlotKey,
} from "@/types/wardrobe";
import { PURPOSE_LABELS } from "@/types/wardrobe";

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

const CORE_SLOTS: SlotKey[] = ["top", "bottom", "shoe"];

function emptyOutfit(): OutfitDraft {
  return { top: undefined, bottom: undefined, shoe: undefined, layer: null };
}

function toOutfitSlots(outfit: OutfitDraft): OutfitSlots {
  return {
    top: outfit.top ?? null,
    bottom: outfit.bottom ?? null,
    shoe: outfit.shoe ?? null,
    layer: outfit.layer ?? null,
  };
}

function outfitName(outfit: OutfitDraft, purpose: Purpose): string {
  const parts = [
    outfit.top?.name,
    outfit.layer?.name,
    outfit.bottom?.name,
    outfit.shoe?.name,
  ].filter(Boolean);
  if (parts.length === 0) return `${PURPOSE_LABELS[purpose]} fit`;
  return parts.slice(0, 2).join(" + ");
}

function shuffleSingleSlot(
  items: ClothingItem[],
  slot: SlotKey,
  purpose: Purpose,
  outfit: OutfitDraft,
): ClothingItem | null {
  const current = toOutfitSlots(outfit);

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = shuffleSlot(items, slot, purpose, current);
    if (!candidate) return current[slot] ?? null;

    const draft: OutfitDraft = { ...outfit, [slot]: candidate };
    const { top, bottom, shoe } = draft;

    if (top && bottom && shoe) {
      if (areItemsCompatible(top, bottom, shoe)) return candidate;
    } else {
      return candidate;
    }
  }

  return shuffleSlot(items, slot, purpose, current);
}

function initialAnimateKeys(): Record<SlotKey, number> {
  return { top: 0, layer: 0, bottom: 0, shoe: 0 };
}

export function OutfitBuilder() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [purpose, setPurpose] = useState<Purpose>("casual");
  const [outfit, setOutfit] = useState<OutfitDraft>(emptyOutfit());
  const [layerEnabled, setLayerEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [animateKeys, setAnimateKeys] = useState(initialAnimateKeys);
  const [fullShuffleStamp, setFullShuffleStamp] = useState(0);
  const [favoritePulse, setFavoritePulse] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedOutfitId, setSavedOutfitId] = useState<string | null>(null);
  const [savePopoverOpen, setSavePopoverOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const heartAnchorRef = useRef<HTMLDivElement>(null);
  const uploadAnchorRef = useRef<HTMLDivElement>(null);
  const segmentAnchorRef = useRef<HTMLDivElement>(null);
  const [popoverTop, setPopoverTop] = useState(0);
  const [popoverOrigin, setPopoverOrigin] = useState("right 0px");
  const shouldReduceMotion = useReducedMotion();

  const refreshCollections = useCallback(() => {
    setCollections(getCollections());
  }, []);

  const refreshWardrobe = useCallback(() => {
    setItems(getItems());
    refreshCollections();
  }, [refreshCollections]);

  const upload = useUploadItemsFlow(refreshWardrobe);

  const clearSavedState = useCallback(() => {
    setIsSaved(false);
    setSavedOutfitId(null);
    setSavePopoverOpen(false);
  }, []);

  const saveCurrentOutfit = useCallback(
    (nextOutfit: OutfitDraft, nextLayerEnabled: boolean, nextPurpose = purpose) => {
      persistDailyOutfit(nextPurpose, nextOutfit, nextLayerEnabled);
    },
    [purpose],
  );

  const applyShuffledOutfit = useCallback(
    (next: ShuffledOutfit | null, withLayer = layerEnabled) => {
      if (!next) return;

      let layer: ClothingItem | null = null;
      if (withLayer) {
        layer = shuffleSingleSlot(items, "layer", purpose, next) ?? null;
      }

      const draft: OutfitDraft = { ...next, layer };
      setOutfit(draft);
      saveCurrentOutfit(draft, withLayer);
      clearSavedState();
    },
    [clearSavedState, items, layerEnabled, purpose, saveCurrentOutfit],
  );

  useEffect(() => {
    const wardrobe = getItems();
    setItems(wardrobe);
    refreshCollections();

    const initialPurpose = getLastDailyPurpose();
    const { outfit: dailyOutfit, layerEnabled: dailyLayer } =
      getOrCreateDailyOutfit(initialPurpose, wardrobe);

    setPurpose(initialPurpose);
    setOutfit(dailyOutfit);
    setLayerEnabled(dailyLayer);
    setReady(true);
  }, [refreshCollections]);

  const bumpAnimateKey = useCallback((slot: SlotKey) => {
    setAnimateKeys((prev) => ({ ...prev, [slot]: prev[slot] + 1 }));
  }, []);

  const bumpSlots = useCallback(
    (slots: SlotKey[]) => {
      slots.forEach((slot) => bumpAnimateKey(slot));
    },
    [bumpAnimateKey],
  );

  const loadPurposeOutfit = useCallback(
    (nextPurpose: Purpose) => {
      const { outfit: dailyOutfit, layerEnabled: dailyLayer } =
        getOrCreateDailyOutfit(nextPurpose, items);

      setPurpose(nextPurpose);
      setOutfit(dailyOutfit);
      setLayerEnabled(dailyLayer);
      setLastDailyPurpose(nextPurpose);
      clearSavedState();
    },
    [clearSavedState, items],
  );

  const handlePurposeChange = (nextPurpose: Purpose) => {
    if (nextPurpose === purpose) return;
    loadPurposeOutfit(nextPurpose);
  };

  const handleFullShuffle = () => {
    const nextOutfit = shuffleFullOutfit(items, purpose, {});
    if (!nextOutfit) return;

    applyShuffledOutfit(nextOutfit);
    setFullShuffleStamp((value) => value + 1);
    bumpSlots(layerEnabled ? ["top", "layer", "bottom", "shoe"] : CORE_SLOTS);
  };

  const handleSlotShuffle = (slot: SlotKey) => {
    const nextItem = shuffleSingleSlot(items, slot, purpose, outfit);
    if (!nextItem) return;

    const nextOutfit: OutfitDraft = { ...outfit, [slot]: nextItem };
    setOutfit(nextOutfit);
    saveCurrentOutfit(nextOutfit, layerEnabled);
    clearSavedState();
    bumpAnimateKey(slot);
  };

  const handleAddLayer = () => {
    setLayerEnabled(true);
    const nextLayer = shuffleSingleSlot(items, "layer", purpose, outfit);
    const nextOutfit: OutfitDraft = { ...outfit, layer: nextLayer };
    setOutfit(nextOutfit);
    saveCurrentOutfit(nextOutfit, true);
    clearSavedState();
    bumpAnimateKey("layer");
  };

  const handleRemoveLayer = () => {
    setLayerEnabled(false);
    const nextOutfit: OutfitDraft = { ...outfit, layer: null };
    setOutfit(nextOutfit);
    saveCurrentOutfit(nextOutfit, false);
    clearSavedState();
  };

  const canSave = useMemo(
    () => Boolean(outfit.top && outfit.bottom && outfit.shoe),
    [outfit],
  );

  useLayoutEffect(() => {
    if (!savePopoverOpen || !toolbarRef.current) return;

    const updatePosition = () => {
      const container = toolbarRef.current!;
      const segment = segmentAnchorRef.current;
      const heart = heartAnchorRef.current;
      const containerRect = container.getBoundingClientRect();

      let nextTop = 0;
      if (segment) {
        const segmentRect = segment.getBoundingClientRect();
        nextTop = Math.round(segmentRect.top - containerRect.top);
        setPopoverTop(nextTop);
      }

      if (heart) {
        const anchorRect = heart.getBoundingClientRect();
        const popoverRight = 16;
        const originX =
          anchorRect.left + anchorRect.width / 2 - containerRect.left - popoverRight;
        const originY = anchorRect.bottom - containerRect.top - nextTop;
        setPopoverOrigin(`${Math.round(originX)}px ${Math.round(originY)}px`);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [savePopoverOpen]);

  useEffect(() => {
    if (upload.stagingOpen) setSavePopoverOpen(false);
  }, [upload.stagingOpen]);

  useEffect(() => {
    if (!savePopoverOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      setSavePopoverOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [savePopoverOpen]);

  const persistFavorite = useCallback(
    (collectionId: string) => {
      if (!outfit.top || !outfit.bottom || !outfit.shoe) return;

      const saved = saveOutfit({
        topItemId: outfit.top.id,
        bottomItemId: outfit.bottom.id,
        shoeItemId: outfit.shoe.id,
        ...(outfit.layer ? { layerItemId: outfit.layer.id } : {}),
        name: outfitName(outfit, purpose),
        purpose,
        collectionId,
        isFavorite: true,
      });

      setIsSaved(true);
      setSavedOutfitId(saved.id);
      setFavoritePulse(true);
      setSavePopoverOpen(false);
      window.setTimeout(() => setFavoritePulse(false), 250);
    },
    [outfit, purpose],
  );

  const handleSelectCollection = useCallback(
    (collectionId: string) => {
      persistFavorite(collectionId);
    },
    [persistFavorite],
  );

  const handleCreateCollection = useCallback(
    (name: string) => {
      const collection = createCollection(name);
      refreshCollections();
      persistFavorite(collection.id);
    },
    [persistFavorite, refreshCollections],
  );

  const handleHeartClick = () => {
    if (!outfit.top || !outfit.bottom || !outfit.shoe) return;

    if (isSaved && savedOutfitId) {
      removeFromFavorites(savedOutfitId);
      clearSavedState();
      setSavePopoverOpen(false);
      return;
    }

    refreshCollections();
    setSavePopoverOpen((open) => !open);
  };

  if (!ready) {
    return <div className="flex h-full min-h-0 flex-col" />;
  }

  const isWardrobeEmpty = items.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={toolbarRef} className="relative shrink-0">
        <PageToolbar
          title="Today's Fit"
          below={
            <div ref={segmentAnchorRef}>
              <PurposeSegmentedControl
                value={purpose}
                onChange={handlePurposeChange}
              />
            </div>
          }
          right={
            <>
              <motion.div
                animate={
                  favoritePulse
                    ? { transform: "scale(1.08)" }
                    : { transform: "scale(1)" }
                }
                transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              >
                <div ref={heartAnchorRef} className="shrink-0">
                  <ToolbarIconButton
                    label={
                      isSaved ? "Remove from favorites" : "Save to collection"
                    }
                    icon={isSaved ? HeartFilled : Heart}
                    onClick={handleHeartClick}
                    disabled={!canSave}
                    variant="secondary"
                    iconSize={18}
                    strokeWidth={isSaved ? 0 : 1.5}
                    active={savePopoverOpen}
                    aria-expanded={savePopoverOpen}
                  />
                </div>
              </motion.div>
              <ToolbarIconButton
                label="Shuffle fit"
                icon={Shuffle}
                onClick={handleFullShuffle}
                disabled={isWardrobeEmpty}
                variant="primary"
                iconSize={18}
                strokeWidth={1.75}
                className="max-md:hidden"
              />
            </>
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
          {savePopoverOpen && (
            <motion.div
              key="save-collection-popover"
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
                onSelectCollection={handleSelectCollection}
                onCreateCollection={handleCreateCollection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isWardrobeEmpty ? (
        <div className="flex flex-1 flex-col overflow-y-auto">
          <WardrobeEmptyState
            icon={Shuffle}
            description="Add your first pieces to start getting daily outfit suggestions."
            onAction={upload.openFilePicker}
          />
        </div>
      ) : (
        <PullToShuffle onShuffle={handleFullShuffle}>
          <OutfitPanel
            top={outfit.top ?? null}
            bottom={outfit.bottom ?? null}
            shoe={outfit.shoe ?? null}
            layer={outfit.layer ?? null}
            layerEnabled={layerEnabled}
            animateKeys={animateKeys}
            fullShuffleStamp={fullShuffleStamp}
            onShuffleSlot={handleSlotShuffle}
            onAddLayer={handleAddLayer}
            onRemoveLayer={handleRemoveLayer}
          />
        </PullToShuffle>
      )}

      {upload.fileInput}
    </div>
  );
}
