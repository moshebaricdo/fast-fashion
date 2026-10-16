"use client";

import type { LucideIcon } from "lucide-react";

interface WardrobeEmptyStateProps {
  icon: LucideIcon;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** When false, content stays near the top (homepage). Defaults to centered. */
  centered?: boolean;
}

export function WardrobeEmptyState({
  icon: Icon,
  description,
  actionLabel = "Add items",
  onAction,
  centered = true,
}: WardrobeEmptyStateProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center px-6 py-10 text-center ${
        centered ? "justify-center" : "justify-start pt-16"
      }`}
    >
      <Icon size={32} strokeWidth={1.5} className="text-stone" />
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone">
        {description}
      </p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-full bg-off-black px-6 py-2.5 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
