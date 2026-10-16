import type { ImgHTMLAttributes } from "react";

interface SquareImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
  rounded?: "none" | "md" | "lg" | "xl" | "2xl";
  /** Applied to the `<img>` element (use for hover/transform effects). */
  imageClassName?: string;
}

const roundedClass = {
  none: "",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export function SquareImage({
  src,
  alt = "",
  rounded = "none",
  className = "",
  imageClassName = "",
  ...props
}: SquareImageProps) {
  return (
    <div
      className={`relative aspect-square w-full overflow-hidden bg-stone/8 ${roundedClass[rounded]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`h-full w-full object-cover object-center ${imageClassName}`}
        {...props}
      />
    </div>
  );
}
