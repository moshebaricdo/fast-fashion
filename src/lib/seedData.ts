import type { ClothingItem } from "@/types/wardrobe";

const COLOR_HEX: Record<string, string> = {
  black: "#1a1816",
  brown: "#5c4033",
  olive: "#4a5234",
  sage: "#8a9a7b",
  stone: "#b8b0a4",
  taupe: "#8b7d6b",
  mushroom: "#9c8b7a",
  cream: "#f4efe6",
  white: "#faf8f5",
  blue: "#4a5568",
  gray: "#6b6560",
  green: "#3d5c4a",
  beige: "#c4b59a",
  other: "#a89f94",
};

function placeholderImage(color: string, label: string): string {
  const hex = COLOR_HEX[color] ?? COLOR_HEX.other;
  const text = label.slice(0, 24).replace(/"/g, "'");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${hex}"/>
    <rect x="24" y="24" width="352" height="352" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <text x="200" y="208" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="sans-serif" font-size="16">${text}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function item(
  id: string,
  name: string,
  category: ClothingItem["category"],
  subcategory: ClothingItem["subcategory"],
  color: ClothingItem["color"],
  purpose: ClothingItem["purpose"],
): ClothingItem {
  return {
    id,
    imageUrl: placeholderImage(color, name),
    name,
    category,
    subcategory,
    color,
    purpose,
    createdAt: new Date().toISOString(),
  };
}

export const SEED_ITEMS: ClothingItem[] = [
  item("top-1", "black rib tee", "top", "t-shirt", "black", "casual"),
  item("top-2", "chocolate brown t-shirt", "top", "t-shirt", "brown", "casual"),
  item("top-3", "khaki rib t-shirt", "top", "t-shirt", "beige", "casual"),
  item("top-4", "brown waffle knit tee", "top", "t-shirt", "brown", "casual"),
  item("top-5", "beige textured t-shirt", "top", "t-shirt", "beige", "casual"),
  item(
    "top-6",
    "sage revere collar shirt",
    "top",
    "button-down",
    "sage",
    "formal",
  ),
  item(
    "top-7",
    "dark green camp collar shirt",
    "top",
    "camp collar shirt",
    "green",
    "casual",
  ),
  item("top-8", "black rib tank", "top", "tank", "black", "sportswear"),
  item("top-9", "dark brown rib tank", "top", "tank", "brown", "sportswear"),
  item(
    "bottom-1",
    "washed brown straight jeans",
    "bottom",
    "jeans",
    "brown",
    "casual",
  ),
  item("bottom-2", "olive linen pants", "bottom", "trousers", "olive", "formal"),
  item("bottom-3", "black linen shorts", "bottom", "shorts", "black", "casual"),
  item(
    "bottom-4",
    "black swim shorts",
    "bottom",
    "shorts",
    "black",
    "sportswear",
  ),
  item("bottom-5", "olive chino shorts", "bottom", "shorts", "olive", "casual"),
  item(
    "bottom-6",
    "stone linen shorts",
    "bottom",
    "shorts",
    "stone",
    "lounge",
  ),
  item("bottom-7", "taupe sweatpants", "bottom", "sweatpants", "taupe", "lounge"),
  item("shoe-1", "white sneakers", "shoe", "sneakers", "white", "casual"),
  item(
    "shoe-2",
    "beige retro sneakers",
    "shoe",
    "sneakers",
    "beige",
    "casual",
  ),
  item(
    "shoe-3",
    "chunky green sneakers",
    "shoe",
    "sneakers",
    "green",
    "sportswear",
  ),
  item("shoe-4", "brown loafers", "shoe", "loafers", "brown", "formal"),
  item("shoe-5", "espresso boots", "shoe", "boots", "brown", "formal"),
];

export const SEED_ITEM_IDS = new Set(SEED_ITEMS.map((item) => item.id));
