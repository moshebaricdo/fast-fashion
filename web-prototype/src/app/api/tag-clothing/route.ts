import { NextResponse } from "next/server";
import { tagClothing, TagClothingError } from "@/lib/ai/tagClothing";
import { mockTagClothing } from "@/lib/mockTagging";

export const runtime = "nodejs";

async function readImageFromRequest(
  request: Request,
): Promise<{ image: string; filename?: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      throw new Error("FormData must include an `image` file");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "image/jpeg";
    const base64 = buffer.toString("base64");

    return {
      image: `data:${mimeType};base64,${base64}`,
      filename: file.name,
    };
  }

  const body = (await request.json()) as {
    image?: string;
    filename?: string;
  };

  if (!body.image || typeof body.image !== "string") {
    throw new Error("JSON body must include an `image` base64 string");
  }

  return {
    image: body.image,
    filename: body.filename,
  };
}

export async function POST(request: Request) {
  try {
    const { image, filename } = await readImageFromRequest(request);
    const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

    if (!hasApiKey) {
      return NextResponse.json({
        tag: mockTagClothing(filename),
        source: "mock",
      });
    }

    const tag = await tagClothing(image);
    return NextResponse.json({ tag, source: "ai" });
  } catch (error) {
    if (error instanceof TagClothingError) {
      return NextResponse.json(
        { error: error.message },
        { status: 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to tag clothing image";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
