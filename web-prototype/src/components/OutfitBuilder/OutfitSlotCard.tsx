"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Shirt, Shuffle, X } from "@/components/icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { inventoryItemHref, ROUTES } from "@/lib/navigation";
import { SquareImage } from "@/components/ui/SquareImage";
import {
  useImageCornerTones,
  type ImageCornerTone,
} from "@/hooks/useImageCornerTones";
import type { ClothingItem, SlotKey } from "@/types/wardrobe";

interface OutfitSlotCardProps {
  slot: SlotKey;
  item: ClothingItem | null;
  animateKey: number;
  staggerIndex?: number;
  onShuffle: () => void;
  onAddLayer?: () => void;
  onRemoveLayer?: () => void;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function cornerButtonClass(tone: ImageCornerTone | null): string {
  const base =
    "absolute z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.94]";

  if (tone === "light") {
    return `${base} bg-white/42 text-off-black shadow-[0_1px_3px_rgba(0,0,0,0.06)]`;
  }

  if (tone === "dark") {
    return `${base} bg-off-black/28 text-white shadow-[0_1px_3px_rgba(0,0,0,0.14)]`;
  }

  return `${base} bg-white/50 text-off-black shadow-[0_1px_3px_rgba(0,0,0,0.05)]`;
}

function CardActionButton({
  tone,
  position,
  label,
  onClick,
  children,
}: {
  tone: ImageCornerTone | null;
  position: "left" | "right";
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`${cornerButtonClass(tone)} ${position === "left" ? "left-2 top-2" : "right-2 top-2"}`}
    >
      {children}
    </button>
  );
}

export function OutfitSlotCard({
  slot,
  item,
  animateKey,
  staggerIndex = 0,
  onShuffle,
  onAddLayer,
  onRemoveLayer,
}: OutfitSlotCardProps) {
  const { topLeft, topRight } = useImageCornerTones(item?.imageUrl);

  return (
    <article className="relative aspect-square w-full min-w-0 overflow-visible rounded-2xl">
      <AnimatePresence mode="wait">
        {item ? (
          <motion.div
            key={`${slot}-${item.id}-${animateKey}`}
            initial={{ opacity: 0, transform: "scale(0.98)" }}
            animate={{ opacity: 1, transform: "scale(1)" }}
            exit={{ opacity: 0, transform: "scale(0.99)" }}
            transition={{
              duration: 0.15,
              ease: EASE_OUT,
              delay: staggerIndex * 0.03,
            }}
            className="absolute inset-0"
          >
            <Link
              href={inventoryItemHref(item.id, ROUTES.ootd)}
              className="group block h-full w-full"
              aria-label={item.name}
            >
              <SquareImage
                src={item.imageUrl}
                alt=""
                rounded="2xl"
                className="grid-card-surface h-full w-full !aspect-auto ring-1 ring-stone/10"
              />
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key={`${slot}-empty`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl bg-stone/8 ring-1 ring-stone/10"
          >
            <span className="text-sm text-stone/50">—</span>
          </motion.div>
        )}
      </AnimatePresence>

      {onRemoveLayer ? (
        <CardActionButton
          tone={topLeft}
          position="left"
          label="Remove layer"
          onClick={onRemoveLayer}
        >
          <X size={15} strokeWidth={1.75} />
        </CardActionButton>
      ) : null}

      {onAddLayer && item ? (
        <CardActionButton
          tone={topLeft}
          position="left"
          label="Add layer"
          onClick={onAddLayer}
        >
          <Shirt size={15} strokeWidth={1.75} />
        </CardActionButton>
      ) : null}

      {item ? (
        <CardActionButton
          tone={topRight}
          position="right"
          label={`Shuffle ${slot}`}
          onClick={onShuffle}
        >
          <Shuffle size={15} strokeWidth={1.75} />
        </CardActionButton>
      ) : null}
    </article>
  );
}
