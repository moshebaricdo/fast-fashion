"use client";

import { motion } from "framer-motion";
import type { ClothingItem } from "@/types/wardrobe";

interface ClothingCardProps {
  item: ClothingItem;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export function ClothingCard({
  item,
  selected = false,
  compact = false,
  onClick,
}: ClothingCardProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "group relative w-full overflow-hidden rounded-2xl text-left",
        "border transition-[box-shadow,border-color] duration-200 ease-out",
        onClick ? "interactive-surface cursor-pointer" : "",
        compact ? "aspect-[3/4]" : "aspect-[4/5]",
        selected
          ? "border-espresso ring-2 ring-espresso/20 shadow-md"
          : "border-stone/30 hover:border-taupe/50 hover:shadow-sm",
      ].join(" ")}
    >
      <div className="relative h-full w-full bg-cream-dark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-off-black/55 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p
            className={[
              "font-display text-cream leading-tight",
              compact ? "text-sm" : "text-base",
            ].join(" ")}
          >
            {item.name}
          </p>
          <p className="mt-0.5 text-xs capitalize text-cream/75">
            {item.color} · {item.subcategory}
          </p>
        </div>
      </div>
      {selected && (
        <motion.span
          initial={{ transform: "scale(0.8)", opacity: 0 }}
          animate={{ transform: "scale(1)", opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-espresso text-cream"
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      )}
    </Tag>
  );
}
