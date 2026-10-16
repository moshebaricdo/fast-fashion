"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

import { PolaroidStack } from "@/components/FavoriteOutfitCard/PolaroidStack";
import { outfitPreviewImages } from "@/lib/favorites";
import type { Outfit } from "@/types/wardrobe";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface FavoriteOutfitCardProps {
  outfit: Outfit;
  collectionId: string;
  index: number;
}

export function FavoriteOutfitCard({
  outfit,
  collectionId,
  index,
}: FavoriteOutfitCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const href = `/favorites/${collectionId}/${outfit.id}`;

  return (
    <motion.div
      initial={
        shouldReduceMotion
          ? { opacity: 1 }
          : { opacity: 0, transform: "translateY(8px)" }
      }
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{
        duration: shouldReduceMotion ? 0.15 : 0.25,
        ease: EASE_OUT,
        delay: shouldReduceMotion ? 0 : index * 0.05,
      }}
    >
      <Link href={href} className="group block">
        <div className="flex items-center gap-4 py-2">
          <PolaroidStack
            images={outfitPreviewImages(outfit)}
            size="md"
            interactive
          />
          <p className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-off-black line-clamp-2">
            {outfit.name}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
