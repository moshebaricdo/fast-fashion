/** @deprecated Use DRAWER_SHEET_MS from @/lib/motion */
export const DRAWER_SHEET_MS = 260;

export const ROUTES = {
  ootd: "/",
  inventory: "/inventory",
  favorites: "/favorites",
  inventoryItem: (id: string) => `/inventory/${id}`,
  collection: (collectionId: string) => `/favorites/${collectionId}`,
  outfit: (collectionId: string, outfitId: string) =>
    `/favorites/${collectionId}/${outfitId}`,
} as const;

export const RETURN_PATH_PARAM = "from";

export function isTabRoot(pathname: string): boolean {
  return (
    pathname === ROUTES.ootd ||
    pathname === ROUTES.inventory ||
    pathname === ROUTES.favorites
  );
}

/** True when pathname is a drawer URL under the given tab root. */
export function isDrawerPath(pathname: string, rootPath: string): boolean {
  if (rootPath === ROUTES.inventory) {
    return /^\/inventory\/[^/]+$/.test(pathname);
  }
  if (rootPath === ROUTES.favorites) {
    return (
      /^\/favorites\/[^/]+$/.test(pathname) ||
      /^\/favorites\/[^/]+\/[^/]+$/.test(pathname)
    );
  }
  return false;
}

export function inventoryItemHref(
  id: string,
  returnPath: string = ROUTES.inventory,
): string {
  const base = ROUTES.inventoryItem(id);
  if (returnPath === ROUTES.inventory) return base;
  return `${base}?${RETURN_PATH_PARAM}=${encodeURIComponent(returnPath)}`;
}

export function resolveInventoryItemReturnPath(
  from: string | null | undefined,
): string {
  if (!from) return ROUTES.inventory;
  if (from === ROUTES.ootd || from === "/") return ROUTES.ootd;
  if (from.startsWith("/")) return from;
  return ROUTES.inventory;
}

export function inventoryItemParent(): string {
  return ROUTES.inventory;
}

export function favoritesCollectionParent(_collectionId: string): string {
  return ROUTES.favorites;
}

export function favoritesOutfitParent(collectionId: string): string {
  return ROUTES.collection(collectionId);
}
