/** Center-crops an image to a 1:1 square. Returns a JPEG data URL. */
export async function cropImageToSquare(
  source: File | Blob | string,
  quality = 0.92,
): Promise<string> {
  const url =
    typeof source === "string"
      ? source
      : URL.createObjectURL(source);

  try {
    const image = await loadImage(url);
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - size) / 2;
    const sy = (image.naturalHeight - size) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(image, sx, sy, size, size, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    if (typeof source !== "string") {
      URL.revokeObjectURL(url);
    }
  }
}

export async function cropFilesToSquare(files: File[]): Promise<File[]> {
  const cropped = await Promise.all(
    files.map(async (file) => {
      const dataUrl = await cropImageToSquare(file);
      const blob = await fetch(dataUrl).then((r) => r.blob());
      return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }),
  );
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
