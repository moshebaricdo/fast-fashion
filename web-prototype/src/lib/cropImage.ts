/** Center-crops an image to a 1:1 square. Returns a JPEG data URL. */
const MAX_OUTPUT_DIMENSION = 1200;
export const MAX_UPLOAD_BATCH = 15;

export async function cropImageToSquare(
  source: File | Blob | string,
  quality = 0.88,
  maxDimension = MAX_OUTPUT_DIMENSION,
): Promise<string> {
  const url =
    typeof source === "string"
      ? source
      : URL.createObjectURL(source);

  try {
    const image = await loadImage(url);
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - cropSize) / 2;
    const sy = (image.naturalHeight - cropSize) / 2;

    const outputSize = Math.min(cropSize, maxDimension);
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(
      image,
      sx,
      sy,
      cropSize,
      cropSize,
      0,
      0,
      outputSize,
      outputSize,
    );
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    if (typeof source !== "string") {
      URL.revokeObjectURL(url);
    }
  }
}

export async function cropFilesToSquare(files: File[]): Promise<File[]> {
  const limited = files.slice(0, MAX_UPLOAD_BATCH);
  const cropped: File[] = [];

  for (const file of limited) {
    const dataUrl = await cropImageToSquare(file);
    const blob = await fetch(dataUrl).then((r) => r.blob());
    cropped.push(
      new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      }),
    );
  }

  return cropped;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
