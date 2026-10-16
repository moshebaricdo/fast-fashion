import { v4 as uuidv4 } from "uuid";

import { SEED_ITEM_IDS, SEED_ITEMS } from "@/lib/seedData";
import type {
  ClothingItem,
  Collection,
  Outfit,
  SavedOutfitInput,
} from "@/types/wardrobe";

const ITEMS_KEY = "wardrobe-items";
const OUTFITS_KEY = "wardrobe-outfits";
const COLLECTIONS_KEY = "wardrobe-collections";
const STORAGE_VERSION_KEY = "wardrobe-storage-version";
const STORAGE_VERSION = 2;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readItemsRaw(): ClothingItem[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClothingItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(items: ClothingItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

function readOutfits(): Outfit[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(OUTFITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Outfit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutfits(outfits: Outfit[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(OUTFITS_KEY, JSON.stringify(outfits));
}

function readCollections(): Collection[] {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(COLLECTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Collection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCollections(collections: Collection[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections));
}

function migrateStorage(): void {
  if (!isBrowser()) return;

  const version = Number(window.localStorage.getItem(STORAGE_VERSION_KEY) ?? "1");
  if (version >= STORAGE_VERSION) return;

  const items = readItemsRaw().filter((item) => !SEED_ITEM_IDS.has(item.id));
  writeItems(items);

  const outfits = readOutfits()
    .map((outfit) => {
      const topItemId = SEED_ITEM_IDS.has(outfit.topItemId) ? "" : outfit.topItemId;
      const bottomItemId = SEED_ITEM_IDS.has(outfit.bottomItemId)
        ? ""
        : outfit.bottomItemId;
      const shoeItemId = SEED_ITEM_IDS.has(outfit.shoeItemId) ? "" : outfit.shoeItemId;
      const layerItemId =
        outfit.layerItemId && SEED_ITEM_IDS.has(outfit.layerItemId)
          ? undefined
          : outfit.layerItemId;

      return { ...outfit, topItemId, bottomItemId, shoeItemId, layerItemId };
    })
    .filter(
      (outfit) => outfit.topItemId && outfit.bottomItemId && outfit.shoeItemId,
    );
  writeOutfits(outfits);

  window.localStorage.setItem(STORAGE_VERSION_KEY, String(STORAGE_VERSION));
}

function ensureSeeded(): void {
  if (!isBrowser() || process.env.NODE_ENV !== "development") return;

  const items = readItemsRaw();
  if (items.length === 0) {
    writeItems(SEED_ITEMS);
  }
}

function prepareStorage(): void {
  migrateStorage();
  ensureSeeded();
}

export function getItems(): ClothingItem[] {
  prepareStorage();
  return readItemsRaw();
}

export function saveItems(items: ClothingItem[]): void {
  writeItems(items);
}

export function saveItem(item: ClothingItem): ClothingItem {
  const items = getItems();
  const index = items.findIndex((existing) => existing.id === item.id);

  if (index >= 0) {
    items[index] = item;
  } else {
    items.unshift(item);
  }

  writeItems(items);
  return item;
}

export function updateItem(
  id: string,
  updates: Partial<Omit<ClothingItem, "id">>,
): ClothingItem | null {
  const items = getItems();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const updated = { ...items[index], ...updates };
  items[index] = updated;
  writeItems(items);
  return updated;
}

export function deleteItem(id: string): void {
  writeItems(getItems().filter((item) => item.id !== id));
}

export function getItemById(id: string): ClothingItem | null {
  return getItems().find((item) => item.id === id) ?? null;
}

export function getItemsByIds(ids: string[]): ClothingItem[] {
  const map = new Map(getItems().map((item) => [item.id, item]));
  return ids
    .map((id) => map.get(id))
    .filter((item): item is ClothingItem => item !== undefined);
}

export function getOutfits(): Outfit[] {
  prepareStorage();
  return readOutfits();
}

export function getCollections(): Collection[] {
  return readCollections();
}

export function getCollectionById(id: string): Collection | null {
  return readCollections().find((collection) => collection.id === id) ?? null;
}

export function createCollection(name: string): Collection {
  const trimmed = name.trim();
  const collection: Collection = {
    id: uuidv4(),
    name: trimmed,
    createdAt: new Date().toISOString(),
  };

  const collections = readCollections();
  collections.unshift(collection);
  writeCollections(collections);
  return collection;
}

export function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, "id">>,
): Collection | null {
  const collections = readCollections();
  const index = collections.findIndex((collection) => collection.id === id);
  if (index < 0) return null;

  const updated = { ...collections[index], ...updates };
  collections[index] = updated;
  writeCollections(collections);
  return updated;
}

export function deleteCollection(id: string): void {
  writeCollections(readCollections().filter((collection) => collection.id !== id));
  writeOutfits(
    readOutfits().map((outfit) =>
      outfit.collectionId === id
        ? { ...outfit, isFavorite: false, collectionId: undefined }
        : outfit,
    ),
  );
}

export function getFavoriteOutfits(collectionId?: string): Outfit[] {
  const favorites = readOutfits().filter((outfit) => outfit.isFavorite);
  if (!collectionId) return favorites;
  return favorites.filter((outfit) => outfit.collectionId === collectionId);
}

export function saveOutfit(input: SavedOutfitInput | Outfit): Outfit {
  const outfits = readOutfits();
  const existingIndex = "id" in input && input.id
    ? outfits.findIndex((outfit) => outfit.id === input.id)
    : -1;

  if (existingIndex >= 0) {
    outfits[existingIndex] = input as Outfit;
    writeOutfits(outfits);
    return outfits[existingIndex];
  }

  const outfit: Outfit = {
    ...(input as SavedOutfitInput),
    id: "id" in input && input.id ? input.id : uuidv4(),
    createdAt:
      "createdAt" in input && input.createdAt
        ? input.createdAt
        : new Date().toISOString(),
    isFavorite:
      "isFavorite" in input && input.isFavorite !== undefined
        ? input.isFavorite
        : true,
  };

  outfits.unshift(outfit);
  writeOutfits(outfits);
  return outfit;
}

export function updateOutfit(
  id: string,
  updates: Partial<Omit<Outfit, "id">>,
): Outfit | null {
  const outfits = readOutfits();
  const index = outfits.findIndex((outfit) => outfit.id === id);
  if (index < 0) return null;

  const updated = { ...outfits[index], ...updates };
  outfits[index] = updated;
  writeOutfits(outfits);
  return updated;
}

export function deleteOutfit(id: string): void {
  writeOutfits(readOutfits().filter((outfit) => outfit.id !== id));
}

export function toggleFavorite(id: string): Outfit | null {
  const outfits = readOutfits();
  const index = outfits.findIndex((outfit) => outfit.id === id);
  if (index < 0) return null;

  outfits[index] = {
    ...outfits[index],
    isFavorite: !outfits[index].isFavorite,
  };

  writeOutfits(outfits);
  return outfits[index];
}

export function removeFromFavorites(outfitId: string): void {
  const outfits = readOutfits();
  const index = outfits.findIndex((outfit) => outfit.id === outfitId);
  if (index < 0) return;

  outfits[index] = { ...outfits[index], isFavorite: false };
  writeOutfits(outfits);
}

export function createOutfit(
  partial: Omit<Outfit, "id" | "createdAt" | "isFavorite"> & {
    isFavorite?: boolean;
  },
): Outfit {
  return saveOutfit({
    ...partial,
    isFavorite: partial.isFavorite ?? false,
  });
}

/** Initializes localStorage and returns all items. */
export function initializeStorage(): ClothingItem[] {
  prepareStorage();
  return readItemsRaw();
}

/** Persists a fully-formed favorite outfit (used by OOTD builder). */
export function addFavoriteOutfit(outfit: Outfit): Outfit {
  return saveOutfit({ ...outfit, isFavorite: true });
}
