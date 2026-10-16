"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SquareImage } from "@/components/ui/SquareImage";
import { inventoryItemHref } from "@/lib/navigation";
import { EASE_OUT } from "@/lib/motion";
import type { ClothingItem } from "@/types/wardrobe";

interface InventoryItemCardProps {
  item: ClothingItem;
}

export function InventoryItemCard({ item }: InventoryItemCardProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      exit={{ opacity: 0, transform: "scale(0.98)" }}
      transition={{ duration: 0.15, ease: EASE_OUT }}
      className="min-w-0"
    >
      <Link
        href={inventoryItemHref(item.id)}
        className="group block"
        aria-label={item.name}
      >
        <SquareImage
          src={item.imageUrl}
          alt=""
          rounded="2xl"
          className="grid-card-surface ring-1 ring-stone/10"
        />
      </Link>
    </motion.div>
  );
}
