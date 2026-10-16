import { shuffleFullOutfit } from "@/lib/shuffleOutfit";
import type { ClothingItem, OutfitDraft, Purpose } from "@/types/wardrobe";
import { PURPOSES } from "@/types/wardrobe";

const DAILY_OOTD_KEY = "wardrobe-daily-ootd";

export interface PersistedDailyOutfit {
  topItemId: string;
  bottomItemId: string;
  shoeItemId: string;
  layerItemId?: string;
  layerEnabled: boolean;
}

interface DailyOotdStore {
  dateEst: string;
  lastPurpose: Purpose;
  outfits: Partial<Record<Purpose, PersistedDailyOutfit>>;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Calendar date in America/New_York (EST/EDT). */
export function getEstDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function emptyStore(dateEst: string): DailyOotdStore {
  return { dateEst, lastPurpose: "casual", outfits: {} };
}

function readStore(): DailyOotdStore {
  if (!isBrowser()) return emptyStore(getEstDateKey());

  try {
    const raw = window.localStorage.getItem(DAILY_OOTD_KEY);
    if (!raw) return emptyStore(getEstDateKey());

    const parsed = JSON.parse(raw) as DailyOotdStore;
    const today = getEstDateKey();

    if (parsed.dateEst !== today) {
      return emptyStore(today);
    }

    return {
      dateEst: today,
      lastPurpose: PURPOSES.includes(parsed.lastPurpose)
        ? parsed.lastPurpose
        : "casual",
      outfits: parsed.outfits ?? {},
    };
  } catch {
    return emptyStore(getEstDateKey());
  }
}

function writeStore(store: DailyOotdStore): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(DAILY_OOTD_KEY, JSON.stringify(store));
}

function resolveDraft(
  persisted: PersistedDailyOutfit,
  items: ClothingItem[],
): OutfitDraft | null {
  const byId = new Map(items.map((item) => [item.id, item]));

  const top = byId.get(persisted.topItemId);
  const bottom = byId.get(persisted.bottomItemId);
  const shoe = byId.get(persisted.shoeItemId);

  if (!top || !bottom || !shoe) return null;

  const layer = persisted.layerItemId
    ? (byId.get(persisted.layerItemId) ?? null)
    : null;

  return { top, bottom, shoe, layer };
}

export function getLastDailyPurpose(): Purpose {
  return readStore().lastPurpose;
}

export function setLastDailyPurpose(purpose: Purpose): void {
  const store = readStore();
  store.lastPurpose = purpose;
  writeStore(store);
}

export function persistDailyOutfit(
  purpose: Purpose,
  outfit: OutfitDraft,
  layerEnabled: boolean,
): void {
  if (!outfit.top || !outfit.bottom || !outfit.shoe) return;

  const store = readStore();
  store.lastPurpose = purpose;
  store.outfits[purpose] = {
    topItemId: outfit.top.id,
    bottomItemId: outfit.bottom.id,
    shoeItemId: outfit.shoe.id,
    ...(outfit.layer ? { layerItemId: outfit.layer.id } : {}),
    layerEnabled,
  };
  writeStore(store);
}

export type DailyOutfitResult = {
  outfit: OutfitDraft;
  layerEnabled: boolean;
  didShuffle: boolean;
};

/**
 * Returns today's persisted outfit for a purpose, or shuffles once and saves.
 */
export function getOrCreateDailyOutfit(
  purpose: Purpose,
  items: ClothingItem[],
): DailyOutfitResult {
  const store = readStore();
  const persisted = store.outfits[purpose];

  if (persisted) {
    const resolved = resolveDraft(persisted, items);
    if (resolved) {
      return {
        outfit: resolved,
        layerEnabled: persisted.layerEnabled,
        didShuffle: false,
      };
    }
  }

  const shuffled = shuffleFullOutfit(items, purpose, {});
  const outfit: OutfitDraft = shuffled ?? {
    top: undefined,
    bottom: undefined,
    shoe: undefined,
    layer: null,
  };

  const layerEnabled = false;

  if (shuffled) {
    persistDailyOutfit(purpose, outfit, layerEnabled);
  }

  return {
    outfit,
    layerEnabled,
    didShuffle: Boolean(shuffled),
  };
}
