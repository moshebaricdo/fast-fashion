import type { Ctx, Item, Slot } from "./types";

const NEUTRAL = new Set(["white", "black", "grey", "navy", "beige", "brown", "denim"]);

/** 12-step wheel. Olive and rust are neighbours, on purpose. */
const WHEEL: Record<string, number> = { rust: 1, olive: 2, blue: 8 };

const BOLD = new Set(["stripe", "print", "check", "graphic"]);

export function dominant(item: Item): string {
  return item.colors[0]?.family ?? "grey";
}

export function isNeutral(family: string): boolean {
  return NEUTRAL.has(family);
}

export function familyScore(a: string, b: string): number {
  if (a === b) return isNeutral(a) ? 0.42 : 0.72;
  const an = isNeutral(a);
  const bn = isNeutral(b);
  if (an && bn) {
    const pair = new Set([a, b]);
    if (pair.has("navy") && pair.has("black")) return 0.08;
    if (pair.has("brown") && pair.has("black")) return 0.05;
    return 0.34;
  }
  if (an || bn) return 0.4;
  const pa = WHEEL[a];
  const pb = WHEEL[b];
  if (pa === undefined || pb === undefined) return 0;
  const raw = Math.abs(pa - pb);
  const d = Math.min(raw, 12 - raw);
  if (d === 1) return 0.58;
  if (d === 2) return 0.22;
  if (d === 6) return 0.3;
  return -0.35;
}

export function itemColorScore(a: Item, b: Item): number {
  let total = 0;
  let wsum = 0;
  a.colors.forEach((x, i) => {
    if (x.share < 0.1) return;
    b.colors.forEach((y, j) => {
      if (y.share < 0.1) return;
      const w = (i === 0 ? 1 : 0.5) * (j === 0 ? 1 : 0.5);
      total += w * familyScore(x.family, y.family);
      wsum += w;
    });
  });
  return wsum === 0 ? 0 : total / wsum;
}

export function accentFamilies(items: Item[]): string[] {
  const seen: string[] = [];
  for (const item of items) {
    const family = dominant(item);
    if (!isNeutral(family) && !seen.includes(family)) seen.push(family);
  }
  return seen;
}

export function roundedCenter(ctx: Ctx): number {
  return Math.round(bandCenter(ctx));
}

export function bandCenter(ctx: Ctx): number {
  if (ctx.mode === "formal") return 4.5;
  if (ctx.mode === "casual") return 2.4;
  if (ctx.mode === "athletic") return 1.3;
  return ctx.center;
}

export function passesItem(item: Item, ctx: Ctx, relaxed: boolean): boolean {
  if (ctx.mode === "athletic" && item.slot !== "outer" && item.style !== "athletic" && !relaxed) return false;
  if (ctx.rain && item.isRainSensitive) return false;
  const center = roundedCenter(ctx);
  const tolerance = relaxed ? 2 : 1;
  if (Math.abs(item.formality - center) > tolerance) return false;
  if (!relaxed && item.slot !== "shoes") {
    const target = ctx.warmth;
    if (item.slot === "top" || item.slot === "onePiece") {
      const lower = target - (ctx.outer !== "none" ? 2 : 1);
      if (item.warmth < lower || item.warmth > target + 1) return false;
    } else if (Math.abs(item.warmth - target) > 1) return false;
  }
  return true;
}

export type Violation = "spread" | "pattern" | "accent";

export function violations(items: Item[]): Violation[] {
  const out: Violation[] = [];
  if (items.length === 0) return out;
  const formalities = items.map((i) => i.formality);
  if (Math.max(...formalities) - Math.min(...formalities) > 2) out.push("spread");
  const bold = items.filter((i) => i.slot !== "shoes" && BOLD.has(i.pattern));
  if (bold.length > 1) out.push("pattern");
  const accents = accentFamilies(items);
  if (accents.length > 2) out.push("accent");
  if (accents.length === 2 && familyScore(accents[0], accents[1]) <= 0) out.push("accent");
  return out;
}

export function compatible(item: Item, picked: Item[]): boolean {
  return violations([...picked, item]).length === 0;
}

export function slotOf(item: Item): Slot {
  return item.slot;
}
