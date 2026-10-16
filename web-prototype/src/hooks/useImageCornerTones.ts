"use client";

import { useEffect, useState } from "react";

export type ImageCornerTone = "light" | "dark";

type CornerTones = {
  topLeft: ImageCornerTone | null;
  topRight: ImageCornerTone | null;
};

const SAMPLE = 24;
const LIGHT_THRESHOLD = 0.58;

function relativeLuminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function sampleRegion(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  corner: "top-left" | "top-right",
): number {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (w === 0 || h === 0) return 0.5;

  const regionW = w * 0.38;
  const regionH = h * 0.38;
  const sx = corner === "top-left" ? 0 : w - regionW;
  const sy = 0;

  ctx.clearRect(0, 0, SAMPLE, SAMPLE);
  ctx.drawImage(img, sx, sy, regionW, regionH, 0, 0, SAMPLE, SAMPLE);

  const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
  let sum = 0;
  const pixels = data.length / 4;

  for (let i = 0; i < data.length; i += 4) {
    sum += relativeLuminance(data[i], data[i + 1], data[i + 2]);
  }

  return sum / pixels;
}

function toTone(luminance: number): ImageCornerTone {
  return luminance > LIGHT_THRESHOLD ? "light" : "dark";
}

export function useImageCornerTones(src: string | undefined): CornerTones {
  const [tones, setTones] = useState<CornerTones>({
    topLeft: null,
    topRight: null,
  });

  useEffect(() => {
    if (!src) {
      setTones({ topLeft: null, topRight: null });
      return;
    }

    let cancelled = false;
    const img = new Image();

    img.onload = () => {
      if (cancelled) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE;
        canvas.height = SAMPLE;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        const leftLum = sampleRegion(ctx, img, "top-left");
        const rightLum = sampleRegion(ctx, img, "top-right");

        setTones({
          topLeft: toTone(leftLum),
          topRight: toTone(rightLum),
        });
      } catch {
        setTones({ topLeft: null, topRight: null });
      }
    };

    img.onerror = () => {
      if (!cancelled) setTones({ topLeft: null, topRight: null });
    };

    img.crossOrigin = "anonymous";
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return tones;
}
