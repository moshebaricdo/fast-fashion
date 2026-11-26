import { itemRecency, pairNovelty } from "./history";
import { bandCenter, itemColorScore } from "./rules";
import type { Ctx, History, Item, Scores, Slot } from "./types";

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp01(n: number): number {
  return Math.max(-1, Math.min(1, n));
}

export function scoreItem(
  item: Item,
  picked: Item[],
  ctx: Ctx,
  history: History,
  noveltyWeight: number,
): { scores: Scores; total: number } {
  const color = picked.length === 0 ? 0.2 : mean(picked.map((p) => itemColorScore(item, p)));
  const center = bandCenter(ctx);
  let formality = 1 - Math.abs(item.formality - center) / 2.2;
  if (picked.length) {
    const gaps = picked.map((p) => {
      const gap = Math.abs(item.formality - p.formality);
      return item.slot === "shoes" || p.slot === "shoes" ? gap * 1.4 : gap;
    });
    formality -= 0.28 * mean(gaps);
  }
  formality = clamp01(formality);

  let weather = 0;
  if (item.slot !== "shoes") {
    const target = ctx.warmth - (ctx.outer !== "none" && (item.slot === "top" || item.slot === "onePiece") ? 1 : 0);
    weather = clamp01(1 - 0.55 * Math.abs(item.warmth - target));
  } else weather = 0.35;
  if (ctx.rain && item.isWaterResistant && (item.slot === "outer" || item.slot === "shoes")) weather += item.slot === "outer" ? 0.9 : 0.45;
  if (ctx.windy && item.slot === "outer" && item.warmth >= 2) weather += 0.25;

  const recency = itemRecency(history, item.id, ctx.day);
  const shown = history.itemShown[item.id] ?? 0;
  const variety = 1 / (1 + shown);
  const favorite = item.isFavorite ? 1 : 0;
  const pattern = item.pattern === "print" || item.pattern === "stripe" ? 0.15 : 0;
  const novelty =
    picked.length === 0 ? 0 : mean(picked.map((p) => pairNovelty(history, item.id, p.id)));

  const stapleDrag = item.staple ? noveltyWeight * 0.45 : 0;

  const total =
    1.05 * color +
    0.85 * formality +
    0.72 * weather -
    1.2 * recency +
    0.55 * variety +
    0.28 * favorite -
    0.35 * pattern +
    noveltyWeight * 1.15 * novelty -
    stapleDrag;

  const scores: Scores = { color, formality, weather, recency, variety, favorite, novelty, pattern, total };
  return { scores, total };
}

export function scoreOutfit(items: Item[], ctx: Ctx, history: History, noveltyWeight: number): Scores {
  if (items.length === 0) {
    return { color: 0, formality: 0, weather: 0, recency: 0, variety: 0, favorite: 0, novelty: 0, pattern: 0, total: -9 };
  }
  const parts = items.map((item) => scoreItem(item, items.filter((o) => o.id !== item.id), ctx, history, noveltyWeight).scores);
  const avg = (key: keyof Scores) => mean(parts.map((p) => p[key]));
  const scores: Scores = {
    color: avg("color"),
    formality: avg("formality"),
    weather: avg("weather"),
    recency: avg("recency"),
    variety: avg("variety"),
    favorite: avg("favorite"),
    novelty: avg("novelty"),
    pattern: avg("pattern"),
    total: 0,
  };
  scores.total =
    1.05 * scores.color +
    0.85 * scores.formality +
    0.72 * scores.weather -
    1.2 * scores.recency +
    0.55 * scores.variety +
    0.28 * scores.favorite -
    0.35 * scores.pattern +
    noveltyWeight * 1.15 * scores.novelty -
    noveltyWeight * 0.2 * mean(items.map((i) => (i.staple ? 1 : 0)));
  return scores;
}

export function formatScores(s: Scores): string {
  const n = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
  return `color ${n(s.color)} · formality ${n(s.formality)} · weather ${n(s.weather)} · recency −${s.recency.toFixed(2)} · novelty ${n(s.novelty)} · total ${n(s.total)}`;
}

export function occupiedSlots(items: Item[]): Slot[] {
  return items.map((i) => i.slot);
}
