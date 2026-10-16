import type {
  ClothingCategory,
  ClothingColor,
  ClothingPurpose,
  ClothingSubcategory,
  TagResult,
} from "@/types/wardrobe";

const SEED_ITEMS: TagResult[] = [
  {
    name: "black rib tee",
    category: "top",
    subcategory: "t-shirt",
    color: "black",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "washed brown jeans",
    category: "bottom",
    subcategory: "jeans",
    color: "brown",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "stone linen shorts",
    category: "bottom",
    subcategory: "shorts",
    color: "stone",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "sage camp collar shirt",
    category: "top",
    subcategory: "camp collar shirt",
    color: "sage",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "chunky green sneakers",
    category: "shoe",
    subcategory: "sneakers",
    color: "green",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "taupe waffle knit tee",
    category: "top",
    subcategory: "t-shirt",
    color: "taupe",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "olive chino trousers",
    category: "bottom",
    subcategory: "trousers",
    color: "olive",
    purpose: "casual",
    confidence: 0.55,
  },
  {
    name: "cream loafers",
    category: "shoe",
    subcategory: "loafers",
    color: "cream",
    purpose: "formal",
    confidence: 0.55,
  },
];

type FilenameHint = {
  category: ClothingCategory;
  subcategory: ClothingSubcategory;
  color: ClothingColor;
  purpose: ClothingPurpose;
  name: string;
};

const FILENAME_HINTS: Array<{ pattern: RegExp; hint: FilenameHint }> = [
  {
    pattern: /jean|denim/i,
    hint: {
      category: "bottom",
      subcategory: "jeans",
      color: "brown",
      purpose: "casual",
      name: "brown jeans",
    },
  },
  {
    pattern: /short/i,
    hint: {
      category: "bottom",
      subcategory: "shorts",
      color: "stone",
      purpose: "casual",
      name: "linen shorts",
    },
  },
  {
    pattern: /trouser|chino|pant/i,
    hint: {
      category: "bottom",
      subcategory: "trousers",
      color: "olive",
      purpose: "casual",
      name: "olive trousers",
    },
  },
  {
    pattern: /sweat/i,
    hint: {
      category: "bottom",
      subcategory: "sweatpants",
      color: "gray",
      purpose: "casual",
      name: "gray sweatpants",
    },
  },
  {
    pattern: /sneaker|trainer/i,
    hint: {
      category: "shoe",
      subcategory: "sneakers",
      color: "white",
      purpose: "casual",
      name: "white sneakers",
    },
  },
  {
    pattern: /loafer/i,
    hint: {
      category: "shoe",
      subcategory: "loafers",
      color: "brown",
      purpose: "formal",
      name: "brown loafers",
    },
  },
  {
    pattern: /boot/i,
    hint: {
      category: "shoe",
      subcategory: "boots",
      color: "brown",
      purpose: "casual",
      name: "brown boots",
    },
  },
  {
    pattern: /tank/i,
    hint: {
      category: "top",
      subcategory: "tank",
      color: "black",
      purpose: "casual",
      name: "black rib tank",
    },
  },
  {
    pattern: /sweater|knit/i,
    hint: {
      category: "top",
      subcategory: "sweater",
      color: "taupe",
      purpose: "casual",
      name: "waffle knit sweater",
    },
  },
  {
    pattern: /shirt|tee|t-shirt/i,
    hint: {
      category: "top",
      subcategory: "t-shirt",
      color: "cream",
      purpose: "casual",
      name: "cream t-shirt",
    },
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function hintFromFilename(filename?: string): FilenameHint | null {
  if (!filename) return null;
  const match = FILENAME_HINTS.find(({ pattern }) => pattern.test(filename));
  return match?.hint ?? null;
}

export function mockTagClothing(filename?: string): TagResult {
  const hint = hintFromFilename(filename);
  if (hint) {
    return {
      ...hint,
      confidence: 0.45,
    };
  }

  const seed =
    SEED_ITEMS[hashString(filename ?? "wardrobe-item") % SEED_ITEMS.length];
  return { ...seed, confidence: 0.4 };
}
