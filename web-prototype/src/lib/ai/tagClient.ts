import type { ClothingTagSuggestion } from "@/types/wardrobe";

export interface TagClothingRequest {
  image: string;
}

export interface TagClothingResponse {
  success: boolean;
  data?: ClothingTagSuggestion;
  error?: string;
}

export async function tagClothing(
  imageDataUrl: string
): Promise<TagClothingResponse> {
  try {
    const response = await fetch("/api/tag-clothing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl } satisfies TagClothingRequest),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        success: false,
        error: payload?.error ?? `Tagging failed (${response.status})`,
      };
    }

    const payload = (await response.json()) as
      | ClothingTagSuggestion
      | { tag: ClothingTagSuggestion; source?: string };

    const data = "tag" in payload ? payload.tag : payload;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Tagging request failed",
    };
  }
}
