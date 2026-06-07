import type {
  Category,
  ClothingItem,
  LockedSlots,
  OutfitSlots,
  Purpose,
  ShuffledOutfit,
  SlotKey,
  Subcategory,
} from "@/types/wardrobe";
import { LAYER_SUBCATEGORIES } from "@/types/wardrobe";

const FORMAL_SHOES = new Set(["loafers", "boots"]);

/** Whether an item's purpose is compatible with the selected outfit purpose. */
export function isPurposeCompatible(
  itemPurpose: Purpose,
  selectedPurpose: Purpose,
): boolean {
  switch (selectedPurpose) {
    case "casual":
      return itemPurpose === "casual";
    case "formal":
      return itemPurpose === "formal" || itemPurpose === "casual";
    case "sportswear":
      return itemPurpose === "sportswear";
    case "lounge":
      return itemPurpose === "lounge" || itemPurpose === "casual";
    default:
      return false;
  }
}

/** Alias used by ItemPicker and outfit builder UI. */
export const itemMatchesPurpose = isPurposeCompatible;

function filterByPurpose(
  items: ClothingItem[],
  purpose: Purpose,
): ClothingItem[] {
  return items.filter((item) => isPurposeCompatible(item.purpose, purpose));
}

function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

/** Lightweight outfit-level compatibility checks. */
export function areItemsCompatible(
  top: ClothingItem,
  bottom: ClothingItem,
  shoe: ClothingItem,
): boolean {
  if (bottom.subcategory === "sweatpants" && FORMAL_SHOES.has(shoe.subcategory)) {
    return false;
  }

  if (bottom.subcategory === "sweatpants" && shoe.purpose === "formal") {
    return false;
  }

  if (top.purpose === "formal" && bottom.purpose === "sportswear") {
    return false;
  }

  if (
    bottom.subcategory === "shorts" &&
    bottom.purpose === "sportswear" &&
    FORMAL_SHOES.has(shoe.subcategory)
  ) {
    return false;
  }

  if (bottom.purpose === "lounge" && shoe.purpose === "formal") {
    return false;
  }

  if (top.subcategory === "button-down" && bottom.subcategory === "sweatpants") {
    return false;
  }

  return true;
}

function byCategory(
  items: ClothingItem[],
  category: Category,
): ClothingItem[] {
  return items.filter((item) => item.category === category);
}

function resolveLockedItem(
  items: ClothingItem[],
  id: string | undefined,
  category: Category,
  purpose: Purpose,
): ClothingItem | null {
  if (!id) return null;

  const item = items.find((candidate) => candidate.id === id);
  if (!item) return null;
  if (item.category !== category) return null;
  if (!isPurposeCompatible(item.purpose, purpose)) return null;

  return item;
}

function shuffleCategorySlot(
  items: ClothingItem[],
  category: Category,
  purpose: Purpose,
  excludeId?: string,
): ClothingItem | null {
  const eligible = filterByPurpose(items, purpose)
    .filter((item) => item.category === category)
    .filter((item) => item.id !== excludeId);

  return pickRandom(eligible);
}

const LAYERABLE = new Set<Subcategory>(LAYER_SUBCATEGORIES);
const BASE_TOP_SUBCATEGORIES = new Set<Subcategory>(["t-shirt", "tank"]);

function shuffleLayerSlot(
  items: ClothingItem[],
  purpose: Purpose,
  baseTop: ClothingItem | null,
  excludeId?: string,
): ClothingItem | null {
  const eligible = filterByPurpose(items, purpose)
    .filter((item) => item.category === "top")
    .filter((item) => item.id !== baseTop?.id)
    .filter((item) => item.id !== excludeId);

  if (eligible.length === 0) return null;

  const preferLayerable =
    baseTop !== null && BASE_TOP_SUBCATEGORIES.has(baseTop.subcategory);
  const layerPool = preferLayerable
    ? eligible.filter((item) => LAYERABLE.has(item.subcategory))
    : eligible;

  return pickRandom(layerPool.length > 0 ? layerPool : eligible);
}

/** Shuffles one slot while keeping the rest of the outfit intact. */
export function shuffleSlot(
  items: ClothingItem[],
  slot: SlotKey,
  purpose: Purpose,
  current: OutfitSlots,
): ClothingItem | null {
  if (slot === "layer") {
    return shuffleLayerSlot(
      items,
      purpose,
      current.top,
      current.layer?.id ?? undefined,
    );
  }

  return shuffleCategorySlot(
    items,
    slot,
    purpose,
    current[slot]?.id ?? undefined,
  );
}

export function shuffleFullOutfit(
  items: ClothingItem[],
  purpose: Purpose,
  lockedSlots: LockedSlots = {},
): ShuffledOutfit | null {
  const eligible = filterByPurpose(items, purpose);

  const lockedTop = resolveLockedItem(
    items,
    lockedSlots.top,
    "top",
    purpose,
  );
  const lockedBottom = resolveLockedItem(
    items,
    lockedSlots.bottom,
    "bottom",
    purpose,
  );
  const lockedShoe = resolveLockedItem(
    items,
    lockedSlots.shoe,
    "shoe",
    purpose,
  );

  const tops = byCategory(eligible, "top").filter(
    (item) => !lockedTop || item.id !== lockedTop.id,
  );
  const bottoms = byCategory(eligible, "bottom").filter(
    (item) => !lockedBottom || item.id !== lockedBottom.id,
  );
  const shoes = byCategory(eligible, "shoe").filter(
    (item) => !lockedShoe || item.id !== lockedShoe.id,
  );

  const topPool = lockedTop ? [lockedTop, ...tops] : tops;
  const bottomPool = lockedBottom ? [lockedBottom, ...bottoms] : bottoms;
  const shoePool = lockedShoe ? [lockedShoe, ...shoes] : shoes;

  if (topPool.length === 0 || bottomPool.length === 0 || shoePool.length === 0) {
    return null;
  }

  const maxAttempts = 120;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const top = lockedTop ?? pickRandom(tops);
    const bottom = lockedBottom ?? pickRandom(bottoms);
    const shoe = lockedShoe ?? pickRandom(shoes);

    if (!top || !bottom || !shoe) continue;
    if (!areItemsCompatible(top, bottom, shoe)) continue;

    return { top, bottom, shoe };
  }

  return null;
}

/** Shuffles unlocked slots for a full outfit refresh. */
export function shuffleOutfit(
  items: ClothingItem[],
  purpose: Purpose,
  current: OutfitSlots,
  lockedSlots: Set<SlotKey>,
): OutfitSlots {
  const locked: LockedSlots = {};

  if (lockedSlots.has("top") && current.top) locked.top = current.top.id;
  if (lockedSlots.has("layer") && current.layer) {
    locked.layer = current.layer.id;
  }
  if (lockedSlots.has("bottom") && current.bottom) {
    locked.bottom = current.bottom.id;
  }
  if (lockedSlots.has("shoe") && current.shoe) locked.shoe = current.shoe.id;

  const result = shuffleFullOutfit(items, purpose, locked);
  if (!result) return current;

  return {
    top: lockedSlots.has("top") ? current.top : result.top,
    layer: lockedSlots.has("layer") ? current.layer : current.layer,
    bottom: lockedSlots.has("bottom") ? current.bottom : result.bottom,
    shoe: lockedSlots.has("shoe") ? current.shoe : result.shoe,
  };
}
