export type Category = "top" | "bottom" | "shoe";

export type Subcategory =
  | "t-shirt"
  | "tank"
  | "sweater"
  | "camp collar shirt"
  | "button-down"
  | "jacket"
  | "jeans"
  | "trousers"
  | "shorts"
  | "sweatpants"
  | "sneakers"
  | "loafers"
  | "boots"
  | "sandals"
  | "other";

export type Color =
  | "black"
  | "brown"
  | "olive"
  | "sage"
  | "stone"
  | "taupe"
  | "mushroom"
  | "cream"
  | "white"
  | "blue"
  | "gray"
  | "green"
  | "beige"
  | "other";

export type Purpose = "casual" | "formal" | "sportswear" | "lounge";

/** Aliases used by AI tagging modules. */
export type ClothingCategory = Category;
export type ClothingSubcategory = Subcategory;
export type ClothingColor = Color;
export type ClothingPurpose = Purpose;

export interface ClothingItem {
  id: string;
  imageUrl: string;
  name: string;
  category: Category;
  subcategory: Subcategory;
  color: Color;
  purpose: Purpose;
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
}

export interface Outfit {
  id: string;
  topItemId: string;
  bottomItemId: string;
  shoeItemId: string;
  layerItemId?: string;
  name: string;
  purpose: Purpose;
  collectionId?: string;
  createdAt: string;
  isFavorite: boolean;
}

export type SavedOutfit = Outfit;

export type SavedOutfitInput = Omit<Outfit, "id" | "createdAt" | "isFavorite">;

export interface TagResult {
  name: string;
  category: Category;
  subcategory: Subcategory;
  color: Color;
  purpose: Purpose;
  confidence: number;
}

export type ClothingTagSuggestion = TagResult;

export interface PendingClothingItem {
  imageUrl: string;
  name: string;
  category: Category;
  subcategory: Subcategory;
  color: Color;
  purpose: Purpose;
}

export type SlotKey = "top" | "layer" | "bottom" | "shoe";

export type OutfitSlots = {
  top: ClothingItem | null;
  bottom: ClothingItem | null;
  shoe: ClothingItem | null;
  layer?: ClothingItem | null;
};

export type LockedSlots = {
  top?: string;
  layer?: string;
  bottom?: string;
  shoe?: string;
};

export type ShuffledOutfit = {
  top: ClothingItem;
  bottom: ClothingItem;
  shoe: ClothingItem;
  layer?: ClothingItem;
};

export type OutfitDraft = {
  top?: ClothingItem;
  bottom?: ClothingItem;
  shoe?: ClothingItem;
  layer?: ClothingItem | null;
};

export interface InventoryFilters {
  search: string;
  categories: Category[];
  colors: Color[];
  purposes: Purpose[];
  subcategories: Subcategory[];
}

export const EMPTY_FILTERS: InventoryFilters = {
  search: "",
  categories: [],
  colors: [],
  purposes: [],
  subcategories: [],
};

export const CATEGORIES: Category[] = ["top", "bottom", "shoe"];
export const SUBCATEGORIES: Subcategory[] = [
  "t-shirt",
  "tank",
  "sweater",
  "camp collar shirt",
  "button-down",
  "jacket",
  "jeans",
  "trousers",
  "shorts",
  "sweatpants",
  "sneakers",
  "loafers",
  "boots",
  "sandals",
  "other",
];
export const COLORS: Color[] = [
  "black",
  "brown",
  "olive",
  "sage",
  "stone",
  "taupe",
  "mushroom",
  "cream",
  "white",
  "blue",
  "gray",
  "green",
  "beige",
  "other",
];
export const PURPOSES: Purpose[] = ["casual", "formal", "sportswear", "lounge"];

/** Aliases for AI schema enums. */
export const CLOTHING_CATEGORIES = CATEGORIES;
export const CLOTHING_SUBCATEGORIES = SUBCATEGORIES;
export const CLOTHING_COLORS = COLORS;
export const CLOTHING_PURPOSES = PURPOSES;

export const SUBCATEGORIES_BY_CATEGORY: Record<Category, Subcategory[]> = {
  top: [
    "t-shirt",
    "tank",
    "sweater",
    "camp collar shirt",
    "button-down",
    "jacket",
    "other",
  ],
  bottom: ["jeans", "trousers", "shorts", "sweatpants", "other"],
  shoe: ["sneakers", "loafers", "boots", "sandals", "other"],
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  casual: "Casual",
  formal: "Formal",
  sportswear: "Sportswear",
  lounge: "Lounge",
};

/** Pre-seeded collection name suggestions shown on first save. */
export const COLLECTION_NAME_SUGGESTIONS: readonly string[] = PURPOSES.map(
  (purpose) => PURPOSE_LABELS[purpose],
);

export const SLOT_LABELS: Record<SlotKey, string> = {
  top: "Top",
  layer: "Layer",
  bottom: "Bottom",
  shoe: "Shoe",
};

/** Tops that work worn over a base tee or tank. */
export const LAYER_SUBCATEGORIES: Subcategory[] = [
  "camp collar shirt",
  "jacket",
  "sweater",
  "button-down",
];

export const COLOR_SWATCHES: Record<Color, string> = {
  black: "#1a1816",
  brown: "#5c4033",
  olive: "#5c6b4a",
  sage: "#8a9a7b",
  stone: "#a09a8f",
  taupe: "#8b7d6b",
  mushroom: "#b8a99a",
  cream: "#f5f0e8",
  white: "#faf8f5",
  blue: "#4a5568",
  gray: "#6b6560",
  green: "#3d5c4a",
  beige: "#c4b59a",
  other: "#a89f94",
};
