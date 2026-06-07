"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Chip active state: off-black background + white text.
 * Inactive: white surface with subtle stone border.
 */
type ChipSize = "sm" | "md";
type ChipVariant = "default" | "accent";

export type ChipProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  active?: boolean;
  children: ReactNode;
  size?: ChipSize;
  variant?: ChipVariant;
};

const sizeClasses: Record<ChipSize, string> = {
  sm: "px-4 py-1 text-xs",
  md: "px-6 py-1.5 text-sm",
};

export function Chip({
  active = false,
  children,
  size = "md",
  variant = "default",
  className = "",
  type = "button",
  ...props
}: ChipProps) {
  const activeClass = active
    ? "border-off-black bg-off-black text-white shadow-sm"
    : "border-stone/25 bg-white text-off-black hover:border-mushroom/60 hover:bg-background";

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-full border font-medium transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] ${sizeClasses[size]} ${activeClass} ${className}`}
      aria-pressed={active}
      {...props}
    >
      {children}
    </button>
  );
}
