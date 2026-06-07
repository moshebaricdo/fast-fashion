"use client";

import { OutfitSlotCard } from "@/components/OutfitBuilder/OutfitSlotCard";
import { OutfitSlotsGrid } from "@/components/OutfitSlotsGrid";
import type { ClothingItem, SlotKey } from "@/types/wardrobe";

interface OutfitPanelProps {
  top: ClothingItem | null;
  bottom: ClothingItem | null;
  shoe: ClothingItem | null;
  layer?: ClothingItem | null;
  layerEnabled: boolean;
  animateKeys: Record<SlotKey, number>;
  fullShuffleStamp: number;
  onShuffleSlot: (slot: SlotKey) => void;
  onAddLayer: () => void;
  onRemoveLayer: () => void;
}

export function OutfitPanel({
  top,
  bottom,
  shoe,
  layer = null,
  layerEnabled,
  animateKeys,
  fullShuffleStamp,
  onShuffleSlot,
  onAddLayer,
  onRemoveLayer,
}: OutfitPanelProps) {
  const hasLayer = layerEnabled;

  const slotProps = (
    slot: SlotKey,
    item: ClothingItem | null,
    index: number,
    extras?: { onAddLayer?: () => void; onRemoveLayer?: () => void },
  ) => ({
    slot,
    item,
    animateKey: fullShuffleStamp + animateKeys[slot],
    staggerIndex: index,
    onShuffle: () => onShuffleSlot(slot),
    ...extras,
  });

  return (
    <div className="w-full px-4">
      <OutfitSlotsGrid
        hasLayer={hasLayer}
        slots={{
          top: (
            <OutfitSlotCard
              {...slotProps("top", top, 0, { onAddLayer })}
            />
          ),
          layer: hasLayer ? (
            <OutfitSlotCard
              {...slotProps("layer", layer, 1, { onRemoveLayer })}
            />
          ) : undefined,
          bottom: (
            <OutfitSlotCard
              {...slotProps("bottom", bottom, hasLayer ? 2 : 1)}
            />
          ),
          shoe: (
            <OutfitSlotCard {...slotProps("shoe", shoe, hasLayer ? 3 : 2)} />
          ),
        }}
      />
    </div>
  );
}
