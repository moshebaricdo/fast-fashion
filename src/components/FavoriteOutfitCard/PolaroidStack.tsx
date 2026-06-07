"use client";

import Image from "next/image";

export type PolaroidImage = {
  url?: string;
  alt: string;
};

const STACK_CONFIG = [
  { rotate: -7, x: -6, y: 0, z: 10 },
  { rotate: 3, x: 8, y: 14, z: 20 },
  { rotate: 8, x: -4, y: 28, z: 30 },
] as const;

const SIZE_STYLES = {
  sm: {
    frame: "h-[72px] w-[56px] p-1 pb-2.5",
    image: "h-[52px] w-full",
    label: "text-[6px]",
  },
  md: {
    frame: "h-[148px] w-[112px] p-2 pb-5",
    image: "h-[108px] w-full",
    label: "text-[9px]",
  },
  lg: {
    frame: "h-[200px] w-[152px] p-2.5 pb-6",
    image: "h-[148px] w-full",
    label: "text-[10px]",
  },
} as const;

interface PolaroidStackProps {
  images: PolaroidImage[];
  size?: keyof typeof SIZE_STYLES;
  className?: string;
  interactive?: boolean;
}

function PolaroidFrame({
  image,
  config,
  size,
}: {
  image: PolaroidImage;
  config: (typeof STACK_CONFIG)[number];
  size: keyof typeof SIZE_STYLES;
}) {
  const styles = SIZE_STYLES[size];

  return (
    <div
      className={`absolute left-1/2 top-0 origin-center rounded-sm bg-white shadow-[0_2px_8px_rgba(42,37,32,0.12),0_1px_2px_rgba(42,37,32,0.06)] ring-1 ring-stone/10 ${styles.frame}`}
      style={{
        transform: `translateX(calc(-50% + ${config.x}px)) translateY(${config.y}px) rotate(${config.rotate}deg)`,
        zIndex: config.z,
      }}
    >
      <div
        className={`relative overflow-hidden rounded-[2px] bg-warm-cream ${styles.image}`}
      >
        {image.url ? (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes={size === "sm" ? "56px" : size === "md" ? "112px" : "152px"}
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-warm-cream to-mushroom/20">
            <span className={`font-medium text-stone/50 ${styles.label}`}>
              {image.alt}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PolaroidStack({
  images,
  size = "md",
  className = "",
  interactive = false,
}: PolaroidStackProps) {
  const stackImages = images.slice(0, 3);
  while (stackImages.length < 3) {
    stackImages.push({ alt: "Item" });
  }

  const containerHeight =
    size === "sm" ? "h-[88px]" : size === "md" ? "h-[180px]" : "h-[240px]";
  const containerWidth =
    size === "sm" ? "w-[72px]" : size === "md" ? "w-[128px]" : "w-[168px]";

  return (
    <div
      className={`relative ${containerWidth} ${containerHeight} ${
        interactive
          ? "grid-card-surface"
          : ""
      } ${className}`}
    >
      {STACK_CONFIG.map((config, index) => (
        <PolaroidFrame
          key={index}
          image={stackImages[index]}
          config={config}
          size={size}
        />
      ))}
    </div>
  );
}
