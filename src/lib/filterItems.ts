import type { ClothingItem, InventoryFilters } from "@/types/wardrobe";

export function filterItems(
  items: ClothingItem[],
  filters: InventoryFilters
): ClothingItem[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (query) {
      const haystack = [
        item.name,
        item.category,
        item.subcategory,
        item.color,
        item.purpose,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(item.category)
    ) {
      return false;
    }

    if (filters.colors.length > 0 && !filters.colors.includes(item.color)) {
      return false;
    }

    if (
      filters.purposes.length > 0 &&
      !filters.purposes.includes(item.purpose)
    ) {
      return false;
    }

    if (
      filters.subcategories.length > 0 &&
      !filters.subcategories.includes(item.subcategory)
    ) {
      return false;
    }

    return true;
  });
}
