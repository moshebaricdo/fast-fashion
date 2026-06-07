import OpenAI from "openai";
import type { TagResult } from "@/types/wardrobe";
import {
  CLOTHING_CATEGORIES,
  CLOTHING_COLORS,
  CLOTHING_PURPOSES,
  CLOTHING_SUBCATEGORIES,
} from "@/types/wardrobe";

const TAG_MODEL = process.env.OPENAI_TAG_MODEL ?? "gpt-4.1-mini";

const TAGGING_PROMPT = `Identify this clothing item for a personal outfit builder app.

Return natural, outfit-useful names (e.g. "black rib tank", "washed brown jeans", "chunky green sneakers").
Do NOT include brand names or product-catalog language.
Use only simple colors from the allowed list.
If uncertain, pick the closest category/subcategory and lower the confidence score (0–1).
Focus on how the item would be used when combining tops, bottoms, and shoes.`;

const TAG_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    category: { type: "string", enum: CLOTHING_CATEGORIES },
    subcategory: { type: "string", enum: CLOTHING_SUBCATEGORIES },
    color: { type: "string", enum: CLOTHING_COLORS },
    purpose: { type: "string", enum: CLOTHING_PURPOSES },
    confidence: { type: "number" },
  },
  required: [
    "name",
    "category",
    "subcategory",
    "color",
    "purpose",
    "confidence",
  ],
  additionalProperties: false,
} as const;

export class TagClothingError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TagClothingError";
  }
}

function normalizeBase64Image(image: string): string {
  const trimmed = image.trim();
  if (trimmed.startsWith("data:")) {
    return trimmed;
  }
  return `data:image/jpeg;base64,${trimmed}`;
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  const chunks: string[] = [];

  for (const item of response.output) {
    if (item.type !== "message") continue;
    for (const part of item.content) {
      if (part.type === "output_text") {
        chunks.push(part.text);
      }
    }
  }

  const text = chunks.join("").trim();
  if (!text) {
    throw new TagClothingError("Model returned an empty response");
  }

  return text;
}

function parseTagResult(raw: unknown): TagResult {
  if (!raw || typeof raw !== "object") {
    throw new TagClothingError("Invalid tag payload from model");
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.name !== "string" || !data.name.trim()) {
    throw new TagClothingError("Missing or invalid name in tag result");
  }

  if (
    typeof data.category !== "string" ||
    !CLOTHING_CATEGORIES.includes(data.category as TagResult["category"])
  ) {
    throw new TagClothingError("Invalid category in tag result");
  }

  if (
    typeof data.subcategory !== "string" ||
    !CLOTHING_SUBCATEGORIES.includes(
      data.subcategory as TagResult["subcategory"],
    )
  ) {
    throw new TagClothingError("Invalid subcategory in tag result");
  }

  if (
    typeof data.color !== "string" ||
    !CLOTHING_COLORS.includes(data.color as TagResult["color"])
  ) {
    throw new TagClothingError("Invalid color in tag result");
  }

  if (
    typeof data.purpose !== "string" ||
    !CLOTHING_PURPOSES.includes(data.purpose as TagResult["purpose"])
  ) {
    throw new TagClothingError("Invalid purpose in tag result");
  }

  const confidence =
    typeof data.confidence === "number"
      ? Math.min(1, Math.max(0, data.confidence))
      : 0.5;

  return {
    name: data.name.trim(),
    category: data.category as TagResult["category"],
    subcategory: data.subcategory as TagResult["subcategory"],
    color: data.color as TagResult["color"],
    purpose: data.purpose as TagResult["purpose"],
    confidence,
  };
}

export async function tagClothing(imageBase64: string): Promise<TagResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new TagClothingError("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  const imageUrl = normalizeBase64Image(imageBase64);

  try {
    const response = await openai.responses.create({
      model: TAG_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: TAGGING_PROMPT },
            {
              type: "input_image",
              image_url: imageUrl,
              detail: "low",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "clothing_tag",
          schema: TAG_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const text = extractOutputText(response);
    const parsed = JSON.parse(text) as unknown;
    return parseTagResult(parsed);
  } catch (error) {
    if (error instanceof TagClothingError) {
      throw error;
    }

    if (error instanceof OpenAI.APIError) {
      throw new TagClothingError(
        `OpenAI API error: ${error.message}`,
        error,
      );
    }

    if (error instanceof SyntaxError) {
      throw new TagClothingError("Failed to parse model JSON response", error);
    }

    throw new TagClothingError("Unexpected error while tagging clothing", error);
  }
}
