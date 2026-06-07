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
        <p className="text-xl font-semibold text-off-black">Nothing here yet</p>
        <p className="mt-2 max-w-xs text-sm text-taupe">
          Add your first piece or adjust filters to see more of your wardrobe.
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
