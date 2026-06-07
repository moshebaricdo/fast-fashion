"use client";

import { AnimatePresence } from "framer-motion";
import type { ClothingItem } from "@/types/wardrobe";
import { InventoryItemCard } from "./InventoryItemCard";

interface InventoryGridProps {
  items: ClothingItem[];
}

export function InventoryGrid({ items }: InventoryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone/30 bg-white/40 px-8 py-16 text-center">
        <p className="text-xl font-semibold text-off-black">No matches</p>
        <p className="mt-2 max-w-xs text-sm text-taupe">
          Try adjusting your search or filters to find what you&apos;re looking
          for.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <InventoryItemCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>
  );
}
