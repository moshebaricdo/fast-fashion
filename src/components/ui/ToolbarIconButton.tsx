"use client";

import type { LucideProps } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { toolbarOutlineBorder } from "@/components/ui/toolbarStyles";
import type { IconComponent } from "@/components/ui/Icon";

interface ToolbarIconButtonProps {
  label: string;
  icon: IconComponent;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  active?: boolean;
  type?: "button" | "submit";
  className?: string;
  strokeWidth?: number;
  iconSize?: number;
  showDot?: boolean;
  "aria-expanded"?: boolean;
}

const baseClass =
  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[transform,background-color,border-color,color,opacity] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40";

export function ToolbarIconButton({
  label,
  icon,
  onClick,
  variant = "secondary",
  disabled = false,
  active = false,
  type = "button",
  className = "",
  strokeWidth = 1.75,
  iconSize = 20,
  showDot = false,
  "aria-expanded": ariaExpanded,
}: ToolbarIconButtonProps) {
  const variantClass =
    variant === "primary"
      ? "border border-transparent bg-off-black text-white hover:bg-off-black/90"
      : active
        ? "border border-stone/40 bg-white text-off-black"
        : `${toolbarOutlineBorder} bg-white text-off-black hover:border-stone/45`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-expanded={ariaExpanded}
      className={`${baseClass} ${variantClass} ${className}`}
    >
      <Icon icon={icon} size={iconSize} strokeWidth={strokeWidth} />
      {showDot ? (
        <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-off-black" />
      ) : null}
    </button>
  );
}
