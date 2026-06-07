import type { TagResult } from "@/types/wardrobe";

export interface TagClothingResponse {
  tag: TagResult;
  source: "ai" | "mock";
}

export async function requestClothingTag(
  file: File,
): Promise<TagClothingResponse> {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/tag-clothing", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as
    | TagClothingResponse
    | { error?: string };

  if (!response.ok) {
    throw new Error(
      "error" in payload && payload.error
        ? payload.error
        : "Failed to tag clothing",
    );
  }

  if (!("tag" in payload)) {
    throw new Error("Invalid tagging response");
  }

  return payload;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image file"));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
}
