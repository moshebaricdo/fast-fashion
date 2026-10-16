import { getCollectionById, getFavoriteOutfits, getItemById } from "@/lib/storage";
import type { ClothingItem, Outfit } from "@/types/wardrobe";

export type OutfitMosaicSlot = {
  url?: string;
  alt: string;
};

export function isValidCollectionId(value: string): boolean {
  return getCollectionById(value) !== null;
}

export function getOutfitItems(outfit: Outfit): {
  top?: ClothingItem;
  layer?: ClothingItem;
  bottom?: ClothingItem;
  shoe?: ClothingItem;
} {
  return {
    top: getItemById(outfit.topItemId) ?? undefined,
    layer: outfit.layerItemId
      ? (getItemById(outfit.layerItemId) ?? undefined)
      : undefined,
    bottom: getItemById(outfit.bottomItemId) ?? undefined,
    shoe: getItemById(outfit.shoeItemId) ?? undefined,
  };
}

export function outfitPreviewImages(
  outfit: Outfit,
): OutfitMosaicSlot[] {
  const items = getOutfitItems(outfit);
  const images = [
    { url: items.top?.imageUrl, alt: items.top?.name ?? "Top" },
    { url: items.bottom?.imageUrl, alt: items.bottom?.name ?? "Bottom" },
    { url: items.shoe?.imageUrl, alt: items.shoe?.name ?? "Shoe" },
  ];

  if (items.layer?.imageUrl) {
    images.splice(1, 0, {
      url: items.layer.imageUrl,
      alt: items.layer.name ?? "Layer",
    });
  }

  return images;
}

/** Square mosaic slots — three columns, or 2×2 when a layer is present. */
export function getOutfitMosaicSlots(outfit: Outfit): OutfitMosaicSlot[] {
  const items = getOutfitItems(outfit);

  if (items.layer?.imageUrl) {
    return [
      { url: items.top?.imageUrl, alt: items.top?.name ?? "Top" },
      { url: items.layer.imageUrl, alt: items.layer.name ?? "Layer" },
      { url: items.bottom?.imageUrl, alt: items.bottom?.name ?? "Bottom" },
      { url: items.shoe?.imageUrl, alt: items.shoe?.name ?? "Shoe" },
    ];
  }

  return [
    { url: items.top?.imageUrl, alt: items.top?.name ?? "Top" },
    { url: items.bottom?.imageUrl, alt: items.bottom?.name ?? "Bottom" },
    { url: items.shoe?.imageUrl, alt: items.shoe?.name ?? "Shoe" },
  ];
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  let state = hashString(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/** Four mosaic slots sampled from unique items across all outfits in a collection. */
export function getCollectionPreviewSlots(
  outfits: Outfit[],
  collectionId: string,
): OutfitMosaicSlot[] {
  const seen = new Set<string>();
  const items: OutfitMosaicSlot[] = [];

  for (const outfit of outfits) {
    const { top, layer, bottom, shoe } = getOutfitItems(outfit);
    for (const item of [top, layer, bottom, shoe]) {
      if (item?.imageUrl && !seen.has(item.id)) {
        seen.add(item.id);
        items.push({ url: item.imageUrl, alt: item.name });
      }
    }
  }

  const seed = `${collectionId}:${outfits
    .map((outfit) => outfit.id)
    .sort()
    .join(",")}`;
  const picked = seededShuffle(items, seed).slice(0, 4);

  while (picked.length < 4) {
    picked.push({ alt: "" });
  }

  return picked;
}

export function getFavoriteOutfitsForItem(itemId: string): Outfit[] {
  return getFavoriteOutfits().filter(
    (outfit) =>
      outfit.topItemId === itemId ||
      outfit.bottomItemId === itemId ||
      outfit.shoeItemId === itemId ||
      outfit.layerItemId === itemId,
  );
}
