import { WARDROBE } from "../data/wardrobe";
import { buildReasons, eyebrowFor, headlineFor } from "./explain";
import { countNovelPairs, outfitBlocked, pairNovelty, signature } from "./history";
import { clamp, rngFrom, weightedPick } from "./rng";
import { compatible, passesItem, violations } from "./rules";
import { scoreItem, scoreOutfit } from "./score";
import type { Angle, Ctx, History, Item, Look, Mode, Outfit, ScenarioId, Slot } from "./types";
import { MAX_NOVEL_PAIRS } from "./types";

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SCENARIOS: Record<
  ScenarioId,
  {
    base: number;
    low: number;
    high: number;
    rain: boolean;
    rainHour: number | null;
    windy: boolean;
    humid: boolean;
    center: number;
    warmth: number;
  }
> = {
  thu: { base: 4, low: 9, high: 14, rain: true, rainHour: 3, windy: false, humid: false, center: 3.15, warmth: 2 },
  sat: { base: 6, low: 18, high: 18, rain: false, rainHour: null, windy: false, humid: false, center: 2.05, warmth: 1 },
  mon: { base: 1, low: 27, high: 27, rain: false, rainHour: null, windy: false, humid: true, center: 3.15, warmth: 0 },
  wed: { base: 3, low: 4, high: 4, rain: false, rainHour: null, windy: true, humid: false, center: 3.6, warmth: 3 },
};

export function makeContext(
  scenario: ScenarioId,
  day: number,
  novelty: number,
  sessionShift = 0,
  mode: Mode = "inferred",
): Ctx {
  const s = SCENARIOS[scenario];
  const weekdayIndex = (((s.base + day) % 7) + 7) % 7;
  const work = weekdayIndex >= 1 && weekdayIndex <= 5;
  const dayLabel = work ? "workday" : `easy ${WEEK_FULL[weekdayIndex]}`;
  let outer: Ctx["outer"] = "none";
  if (s.low <= 6 || (s.windy && s.high < 10)) outer = "required";
  else if (s.high >= 24 && !s.rain) outer = "none";
  else if (s.rain || s.low < 12) outer = "optional";
  return {
    scenario,
    day,
    weekdayIndex,
    weekdayShort: WEEK[weekdayIndex],
    dayLabel,
    low: s.low,
    high: s.high,
    rain: s.rain,
    rainHour: s.rainHour,
    windy: s.windy,
    humid: s.humid,
    center: clamp(s.center + sessionShift, 1, 5),
    warmth: s.warmth,
    outer,
    novelty: clamp(novelty, 0, 1),
    mode,
  };
}

export function contextEyebrow(ctx: Ctx): string {
  const temp = ctx.low !== ctx.high ? `${ctx.low}°→${ctx.high}°` : `${ctx.high}°`;
  const tail = ctx.rain ? `RAIN AFTER ${ctx.rainHour}` : ctx.dayLabel.toUpperCase();
  return `${ctx.weekdayShort} · ${temp} · ${tail}`;
}

export function outfitItems(outfit: { bySlot: Partial<Record<Slot, Item>> }): Item[] {
  return (["outer", "onePiece", "top", "bottom", "shoes"] as Slot[])
    .map((slot) => outfit.bySlot[slot])
    .filter((item): item is Item => Boolean(item));
}

export function meanFormality(outfit: Outfit): number {
  const items = outfitItems(outfit);
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.formality, 0) / items.length;
}

interface AssembleOpts {
  allowRepeat?: boolean;
  allowNovelOverflow?: boolean;
  requireOuter?: boolean;
}

function assemble(
  bySlot: Partial<Record<Slot, Item>>,
  ctx: Ctx,
  history: History,
  angle: Angle,
  noveltyWeight: number,
  delta: number,
  opts: AssembleOpts = {},
): Outfit | null {
  const items = outfitItems({ bySlot });
  if (violations(items).length) return null;
  const hasBase = Boolean(bySlot.onePiece || (bySlot.top && bySlot.bottom));
  if (!hasBase || !bySlot.shoes) return null;
  if ((opts.requireOuter ?? ctx.outer === "required") && !bySlot.outer) return null;
  if (ctx.outer === "none" && bySlot.outer) return null;
  const ids = items.map((item) => item.id);
  if (!opts.allowRepeat && outfitBlocked(history, ids, ctx.day)) return null;
  const novelPairs = countNovelPairs(history, ids);
  if (!opts.allowNovelOverflow && novelPairs > MAX_NOVEL_PAIRS) return null;
  const scores = scoreOutfit(items, ctx, history, noveltyWeight);
  const reasons = buildReasons(items, ctx, history, angle, delta);
  return {
    bySlot: { ...bySlot },
    ids,
    signature: signature(ids),
    scores,
    novelPairs,
    reasons,
    angle,
    formalityDelta: delta,
  };
}

function pool(slot: Slot, ctx: Ctx, relaxed: boolean): Item[] {
  return WARDROBE.filter((item) => item.slot === slot && passesItem(item, ctx, relaxed));
}

interface SampleOpts {
  locks?: Partial<Record<Slot, Item>>;
  skipOuter?: boolean;
  forceOuter?: Item | null;
  noveltyWeight: number;
  temperature: number;
  preferDead?: boolean;
  allowOne?: boolean;
}

function sampleOne(rnd: () => number, ctx: Ctx, history: History, opts: SampleOpts): Outfit | null {
  for (const relaxed of [false, true]) {
    const locks = { ...(opts.locks ?? {}) };
    if (opts.forceOuter) locks.outer = opts.forceOuter;
    const useOne = opts.allowOne !== false && !locks.top && !locks.bottom && !locks.onePiece && rnd() < 0.08;
    const order: Slot[] = [];
    if (ctx.outer === "required" || opts.forceOuter) order.push("outer");
    else if (ctx.outer === "optional" && !opts.skipOuter && rnd() < 0.3) order.push("outer");
    if (useOne) order.push("onePiece", "shoes");
    else order.push("top", "bottom", "shoes");

    const bySlot: Partial<Record<Slot, Item>> = {};
    let picked: Item[] = [];
    let failed = false;
    for (const slot of order) {
      const locked = locks[slot];
      if (locked) {
        if (violations([...picked, locked]).length) {
          failed = true;
          break;
        }
        bySlot[slot] = locked;
        picked = outfitItems({ bySlot });
        continue;
      }
      let options = pool(slot, ctx, relaxed).filter((item) => compatible(item, picked));
      if (slot === "outer" && ctx.rain) {
        const wet = options.filter((item) => item.isWaterResistant);
        if (wet.length) options = wet;
      }
      if (options.length === 0) {
        failed = true;
        break;
      }
      const weights = options.map((item) => {
        let { total } = scoreItem(item, picked, ctx, history, opts.noveltyWeight);
        if (opts.preferDead && (history.itemShown[item.id] ?? 0) === 0) total += 2.6;
        return Math.exp(clamp(total / opts.temperature, -20, 20));
      });
      bySlot[slot] = weightedPick(options, weights, rnd);
      picked = outfitItems({ bySlot });
    }
    if (failed) continue;
    const made = assemble(bySlot, ctx, history, "safe", opts.noveltyWeight, 0);
    if (made) return made;
  }
  return null;
}

function shareCount(a: string[], b: string[]): number {
  const set = new Set(a);
  return b.filter((id) => set.has(id)).length;
}

function matchesAngle(outfit: Outfit, angle: Angle, history: History): boolean {
  if (angle === "safe") {
    return outfit.novelPairs === 0 && outfit.ids.every((id) => (history.itemShown[id] ?? 0) > 0);
  }
  if (angle === "novel") return outfit.novelPairs === 1;
  if (angle === "remix") {
    if (outfit.novelPairs !== 1) return false;
    return history.shown.filter((entry) => entry.saved).some((entry) => shareCount(entry.ids, outfit.ids) === 1);
  }
  if (angle === "rediscover") return outfit.ids.some((id) => (history.itemShown[id] ?? 0) === 0);
  if (angle === "weather") return Boolean(outfit.bySlot.outer);
  return true;
}

function bestOuter(ctx: Ctx): Item | null {
  const outers = pool("outer", ctx, true);
  if (outers.length === 0) return null;
  return [...outers].sort((a, b) => outerRank(b, ctx) - outerRank(a, ctx))[0] ?? null;
}

function outerRank(item: Item, ctx: Ctx): number {
  return (
    (ctx.rain && item.isWaterResistant ? 4 : 0) +
    (item.isFavorite ? 0.5 : 0) -
    Math.abs(item.formality - ctx.center) * 0.45 -
    Math.abs(item.warmth - ctx.warmth) * 0.35
  );
}

function noveltyFor(angle: Angle, ctx: Ctx): number {
  if (angle === "safe") return 0.06;
  if (angle === "novel" || angle === "remix") return 0.4 + ctx.novelty * 1.15;
  if (angle === "rediscover") return 0.3 + ctx.novelty * 0.4;
  return 0.2 + ctx.novelty * 0.35;
}

function accentNovelBonus(outfit: Outfit): number {
  const reason = outfit.reasons.find((entry) => entry.kind === "novelPair");
  if (!reason?.a || !reason.b) return 0;
  const items = outfitItems(outfit);
  const a = items.find((item) => item.id === reason.a);
  const b = items.find((item) => item.id === reason.b);
  if (!a || !b) return 0;
  const fa = a.colors[0]?.family ?? "";
  const fb = b.colors[0]?.family ?? "";
  if (fa === "olive" || fb === "olive" || fa === "rust" || fb === "rust") {
    if ((fa === "olive" && fb === "rust") || (fa === "rust" && fb === "olive")) return 1.6;
    return 0.25;
  }
  return 0;
}

function rankFor(outfit: Outfit, angle: Angle, history: History): number {
  const savedHits = outfit.ids.filter((id) => history.shown.some((entry) => entry.saved && entry.ids.includes(id))).length;
  return (
    outfit.scores.total +
    (angle === "safe" ? outfit.scores.favorite * 1.3 + savedHits * 0.22 + (1 - outfit.scores.recency) * 0.2 : 0) +
    (angle === "novel" ? accentNovelBonus(outfit) : 0) +
    (angle === "rediscover" ? outfit.scores.variety * 1.4 : 0) +
    (angle === "weather" && outfit.bySlot.outer?.isWaterResistant ? 0.7 : 0) -
    (outfit.bySlot.onePiece ? 1.2 : 0)
  );
}

function collectAngle(history: History, ctx: Ctx, seed: string, angle: Angle): { outfit: Outfit; rank: number }[] {
  const rnd = rngFrom([seed, ctx.day, ctx.scenario, ctx.mode, ctx.center.toFixed(2), ctx.novelty.toFixed(2)]);
  const weight = noveltyFor(angle, ctx);
  const dead = WARDROBE.filter(
    (item) => (history.itemShown[item.id] ?? 0) === 0 && (item.slot === "top" || item.slot === "bottom"),
  );
  const found = new Map<string, { outfit: Outfit; rank: number }>();
  for (let i = 0; i < 320; i++) {
    const locks: Partial<Record<Slot, Item>> = {};
    let preferDead = false;
    if (angle === "rediscover" && dead.length > 0 && i % 2 === 0) {
      const deadItem = dead[Math.floor(rnd() * dead.length)];
      locks[deadItem.slot] = deadItem;
      preferDead = true;
    }
    if (angle === "novel" && i % 3 === 0) {
      const favorites = WARDROBE.filter(
        (item) => item.slot === "top" && item.isFavorite && !item.staple && passesItem(item, ctx, false),
      );
      if (favorites.length) locks.top = favorites[Math.floor(rnd() * favorites.length)];
    }
    const sampled = sampleOne(rnd, ctx, history, {
      locks,
      skipOuter: angle !== "weather" && ctx.outer !== "required",
      forceOuter: angle === "weather" ? bestOuter(ctx) : null,
      noveltyWeight: weight,
      temperature: angle === "safe" ? 0.34 : 0.55,
      preferDead,
      allowOne: false,
    });
    if (!sampled) continue;
    const rebuilt = assemble(sampled.bySlot, ctx, history, angle, weight, 0);
    if (!rebuilt || !matchesAngle(rebuilt, angle, history)) continue;
    const rank = rankFor(rebuilt, angle, history);
    const prev = found.get(rebuilt.signature);
    if (!prev || rank > prev.rank) found.set(rebuilt.signature, { outfit: rebuilt, rank });
  }
  const sorted = [...found.values()].sort((a, b) => b.rank - a.rank);
  const kept: { outfit: Outfit; rank: number }[] = [];
  const shoeCounts = new Map<string, number>();
  for (const row of sorted) {
    const shoe = row.outfit.bySlot.shoes?.id ?? "";
    const seen = shoeCounts.get(shoe) ?? 0;
    if (seen >= 4) continue;
    shoeCounts.set(shoe, seen + 1);
    kept.push(row);
    if (kept.length >= 16) break;
  }
  return kept.length >= 8 ? kept : sorted.slice(0, 16);
}

function assignEdition(pools: { outfit: Outfit; rank: number }[][]): Outfit[] {
  let best: Outfit[] = [];
  let bestScore = -Infinity;
  const chosen: { outfit: Outfit; rank: number }[] = [];
  let visits = 0;
  const scoreOf = () => {
    let score = chosen.reduce((sum, row) => sum + row.rank, 0);
    const counts = new Map<string, number>();
    for (const row of chosen) {
      for (const id of row.outfit.ids) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const count of counts.values()) {
      if (count > 1) score -= 1.45 * (count - 1);
      if (count > 2) score -= 2.4 * (count - 2);
    }
    return score;
  };
  const walk = (index: number) => {
    if (visits++ > 80000) return;
    if (index === pools.length) {
      const score = scoreOf();
      if (chosen.length > best.length || (chosen.length === best.length && score > bestScore)) {
        best = chosen.map((row) => row.outfit);
        bestScore = score;
      }
      return;
    }
    for (const row of pools[index]) {
      if (chosen.some((existing) => existing.outfit.signature === row.outfit.signature)) continue;
      if (chosen.some((existing) => shareCount(existing.outfit.ids, row.outfit.ids) > 1)) continue;
      chosen.push(row);
      walk(index + 1);
      chosen.pop();
      if (visits > 80000) return;
    }
  };
  walk(0);
  return best;
}

function searchLoose(history: History, ctx: Ctx, seed: string, chosen: Outfit[]): Outfit | null {
  const rnd = rngFrom([seed, "loose", ctx.day]);
  for (let i = 0; i < 80; i++) {
    const sampled = sampleOne(rnd, ctx, history, {
      skipOuter: ctx.outer !== "required",
      noveltyWeight: 0.3,
      temperature: 0.6,
      allowOne: false,
    });
    if (!sampled) continue;
    if (chosen.some((existing) => existing.signature === sampled.signature)) continue;
    if (chosen.some((existing) => shareCount(existing.ids, sampled.ids) > 2)) continue;
    return sampled;
  }
  return null;
}

export function toLook(outfit: Outfit, ctx: Ctx): Look {
  const reason = outfit.reasons[0] ?? { kind: "familiar" as const, weight: 0, text: "A complete outfit." };
  return {
    outfit,
    eyebrow: eyebrowFor(outfit.angle, ctx, reason.kind),
    headline: headlineFor(reason, outfitItems(outfit), ctx),
    line: reason.text,
  };
}

export function generateEdition(history: History, ctx: Ctx, seed: string): Look[] {
  const weatherNotable = ctx.rain || ctx.low <= 6 || ctx.high >= 26 || ctx.windy;
  const angles: Angle[] = weatherNotable
    ? ["safe", "novel", "rediscover", "weather"]
    : ["safe", "novel", "rediscover", "remix"];
  const pools = angles.map((angle) => collectAngle(history, ctx, `${seed}:${angle}`, angle));
  const chosen = assignEdition(pools);
  while (chosen.length < 4) {
    const filler = searchLoose(history, ctx, `${seed}:fill:${chosen.length}`, chosen);
    if (!filler) break;
    chosen.push({ ...filler, angle: "remix" });
  }
  if (chosen.length === 0) {
    const emergency = suggestOutfit(history, ctx, seed);
    if (emergency) chosen.push(emergency);
  }
  return chosen.map((outfit) => toLook(outfit, ctx));
}

export function suggestOutfit(history: History, ctx: Ctx, seed: string): Outfit | null {
  const rnd = rngFrom([seed, "open", ctx.scenario, ctx.day, ctx.mode, ctx.center.toFixed(2), ctx.novelty.toFixed(2)]);
  const weight = 0.22 + ctx.novelty * 0.85;
  const bag: Outfit[] = [];
  for (let i = 0; i < 70; i++) {
    const sampled = sampleOne(rnd, ctx, history, {
      skipOuter: ctx.outer !== "required",
      noveltyWeight: weight,
      temperature: 0.4,
      allowOne: false,
    });
    if (sampled) bag.push(sampled);
  }
  if (bag.length === 0) return greedy(history, ctx);
  bag.sort((a, b) => suggestRank(b, history) - suggestRank(a, history));
  const top = bag.slice(0, Math.max(3, Math.ceil(bag.length / 5)));
  const unique: Outfit[] = [];
  for (const outfit of top) {
    if (!unique.some((existing) => existing.signature === outfit.signature)) unique.push(outfit);
  }
  return weightedPick(
    unique,
    unique.map((outfit) => Math.exp(clamp(suggestRank(outfit, history) / 0.45, -20, 20))),
    rnd,
  );
}

function suggestRank(outfit: Outfit, history: History): number {
  const dead = outfit.ids.some((id) => (history.itemShown[id] ?? 0) === 0) ? 1.1 : 0;
  return outfit.scores.total - dead - outfit.novelPairs * 0.2 - (outfit.bySlot.onePiece ? 0.4 : 0);
}

function greedy(history: History, ctx: Ctx): Outfit | null {
  const bySlot: Partial<Record<Slot, Item>> = {};
  const order: Slot[] = ctx.outer === "required" ? ["outer", "top", "bottom", "shoes"] : ["top", "bottom", "shoes"];
  for (const slot of order) {
    const picked = outfitItems({ bySlot });
    const options = WARDROBE.filter((item) => item.slot === slot && passesItem(item, ctx, true) && compatible(item, picked));
    options.sort((a, b) => scoreItem(b, picked, ctx, history, 0.15).total - scoreItem(a, picked, ctx, history, 0.15).total);
    if (options[0]) bySlot[slot] = options[0];
  }
  return assemble(bySlot, ctx, history, "safe", 0.15, 0, { allowRepeat: true, allowNovelOverflow: true });
}

function othersFor(slot: Slot, given: Item[], candidate: Item): Item[] {
  return given.filter((item) => {
    if (item.slot === slot && candidate.slot === slot) return false;
    if (candidate.slot === "onePiece" && (item.slot === "top" || item.slot === "bottom")) return false;
    if ((candidate.slot === "top" || candidate.slot === "bottom") && item.slot === "onePiece") return false;
    if (slot === "top" && item.slot === "onePiece") return false;
    if (slot === "top" && item.slot === "top") return false;
    if (slot === "bottom" && item.slot === "bottom") return false;
    return item.slot !== slot;
  });
}

export function alternatives(
  slot: Slot,
  given: Item[],
  ctx: Ctx,
  history: History,
  seed: string,
  k = 8,
): Item[] {
  const rnd = rngFrom([seed, "alt", slot, ctx.mode, ctx.day, ctx.center.toFixed(2), given.map((item) => item.id).join(".")]);
  const currentIds = new Set(given.filter((item) => item.slot === slot || (slot === "top" && item.slot === "onePiece")).map((item) => item.id));
  let options = WARDROBE.filter((item) => {
    if (slot === "top") return item.slot === "top" || item.slot === "onePiece";
    return item.slot === slot;
  });
  options = options.filter((item) => !currentIds.has(item.id));
  options = options.filter((item) => passesItem(item, ctx, false) || passesItem(item, ctx, true));
  if (ctx.outer === "none" && slot === "outer") return [];
  options = options.filter((item) => violations([...othersFor(slot, given, item), item]).length === 0);
  const weight = 0.18 + ctx.novelty * 0.45;
  const ranked = options
    .map((item) => {
      const { total } = scoreItem(item, othersFor(slot, given, item), ctx, history, weight);
      return { item, total: total + (rnd() - 0.5) * 0.05 };
    })
    .sort((a, b) => b.total - a.total);
  return ranked.slice(0, k).map((row) => row.item);
}

export function replaceSlot(
  outfit: Outfit,
  slot: Slot,
  item: Item,
  ctx: Ctx,
  history: History,
): Outfit | null {
  const bySlot: Partial<Record<Slot, Item>> = { ...outfit.bySlot, [item.slot]: item };
  if (slot !== item.slot) delete bySlot[slot];
  if (item.slot === "onePiece") {
    delete bySlot.top;
    delete bySlot.bottom;
  }
  if (item.slot === "top" || item.slot === "bottom") delete bySlot.onePiece;
  const swapped = item.slot === "shoes" || slot === "shoes";
  const shoeGap = item.formality - (outfit.bySlot.shoes?.formality ?? item.formality);
  const delta = outfit.formalityDelta + (swapped && shoeGap > 0.5 ? 1 : swapped && shoeGap < -0.5 ? -1 : 0);
  return assemble(bySlot, ctx, history, outfit.angle, 0.35, delta, { allowRepeat: true, allowNovelOverflow: true });
}

export function variantOutfit(
  outfit: Outfit,
  direction: 1 | -1,
  ctx: Ctx,
  history: History,
  seed: string,
): Outfit | null {
  const shifted: Ctx = { ...ctx, center: clamp(ctx.center + direction * 0.9, 1, 5) };
  const lock = new Set<string>();
  const items = outfitItems(outfit);
  for (const reason of outfit.reasons) {
    if (reason.kind !== "novelPair") continue;
    for (const id of [reason.a, reason.b]) {
      const piece = items.find((item) => item.id === id);
      if (piece && piece.slot !== "shoes") lock.add(piece.id);
    }
  }
  let idea: [Item, Item] | null = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (pairNovelty(history, items[i].id, items[j].id) < 0.99) continue;
      const pair: [Item, Item] = [items[i], items[j]];
      const shoes = pair.filter((item) => item.slot === "shoes").length;
      const bestShoes = idea ? idea.filter((item) => item.slot === "shoes").length : 2;
      if (!idea || shoes < bestShoes) idea = pair;
    }
  }
  if (idea) {
    for (const item of idea) {
      if (item.slot !== "shoes") lock.add(item.id);
    }
  }
  if (lock.size === 0) {
    const anchor = outfit.bySlot.top ?? outfit.bySlot.onePiece ?? outfit.bySlot.bottom;
    if (anchor) lock.add(anchor.id);
  }
  const bySlot: Partial<Record<Slot, Item>> = { ...outfit.bySlot };
  for (const slot of ["outer", "top", "bottom", "onePiece", "shoes"] as Slot[]) {
    const current = bySlot[slot];
    if (!current || lock.has(current.id)) continue;
    const options = alternatives(slot, outfitItems({ bySlot }), shifted, history, `${seed}:var:${direction}:${slot}`, 10);
    const moving = options.filter((option) => (direction > 0 ? option.formality >= current.formality : option.formality <= current.formality));
    moving.sort((a, b) => Math.abs(a.formality - shifted.center) - Math.abs(b.formality - shifted.center));
    if (moving[0] && moving[0].id !== current.id) bySlot[slot] = moving[0];
  }
  const next = assemble(bySlot, shifted, history, outfit.angle, 0.2, outfit.formalityDelta + direction, {
    allowRepeat: true,
    allowNovelOverflow: true,
  });
  if (!next || next.signature === outfit.signature) return null;
  return next;
}

export function anchorCandidates(ctx: Ctx, history: History, seed: string): Item[] {
  const poolItems = WARDROBE.filter((item) => item.slot === "top" || item.slot === "onePiece");
  const ranked = poolItems
    .map((item) => {
      const comps = completions(item, ctx, history, seed);
      if (comps.length < 3) return null;
      const shown = history.itemShown[item.id] ?? 0;
      const saves = history.shown.filter((entry) => entry.saved && entry.ids.includes(item.id));
      const companionCounts = new Map<string, number>();
      for (const save of saves) {
        for (const id of save.ids) {
          if (id === item.id) continue;
          companionCounts.set(id, (companionCounts.get(id) ?? 0) + 1);
        }
      }
      const stuck = Math.max(0, ...companionCounts.values());
      const recent = history.itemLastDay[item.id];
      const age = recent === undefined ? 99 : ctx.day - recent;
      const score =
        (item.isFavorite ? 1.7 : 0) +
        (1 / (1 + shown)) * 1.5 +
        (saves.length >= 2 && stuck >= 2 ? 1.8 : 0) +
        Math.min(comps.length, 6) * 0.15 -
        (age <= 4 ? 1.1 : 0) +
        (passesItem(item, ctx, false) ? 0.45 : passesItem(item, ctx, true) ? 0 : -2);
      return { item, score };
    })
    .filter((row): row is { item: Item; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, 3).map((row) => row.item);
}

export function completions(anchor: Item, ctx: Ctx, history: History, seed: string): Outfit[] {
  const rnd = rngFrom([seed, "orbit", anchor.id, ctx.day, ctx.scenario, ctx.center.toFixed(2), ctx.novelty.toFixed(2)]);
  const found: Outfit[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) {
    const sampled = sampleOne(rnd, ctx, history, {
      locks: { [anchor.slot]: anchor },
      skipOuter: ctx.outer !== "required",
      noveltyWeight: 0.35 + ctx.novelty * 0.7,
      temperature: 0.62,
    });
    if (!sampled) continue;
    const rebuilt = assemble(sampled.bySlot, ctx, history, "remix", 0.4, 0, { allowNovelOverflow: false });
    if (!rebuilt) continue;
    const key = rebuilt.ids.filter((id) => id !== anchor.id).join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    found.push(rebuilt);
  }
  found.sort((a, b) => meanFormality(a) - meanFormality(b));
  if (found.length <= 7) return found;
  const picked: Outfit[] = [];
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const index = Math.round((i * (found.length - 1)) / (steps - 1));
    const outfit = found[index];
    if (outfit && !picked.some((existing) => existing.signature === outfit.signature)) picked.push(outfit);
  }
  return picked;
}

export function restingIndex(sets: Outfit[], ctx: Ctx): number {
  let best = 0;
  let bestDistance = Infinity;
  sets.forEach((outfit, index) => {
    const distance = Math.abs(meanFormality(outfit) - ctx.center);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}

export interface Reel {
  slot: Slot;
  items: Item[];
  index: number;
  pinned: boolean;
}

function shuffle<T>(items: T[], rnd: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function baselineItems(slot: Slot, ctx: Ctx, seed: string): Item[] {
  const rnd = rngFrom([seed, "baseline", slot, ctx.mode, ctx.day]);
  const slots: Slot[] = slot === "top" ? ["top", "onePiece"] : [slot];
  const items = WARDROBE.filter((item) => slots.includes(item.slot) && passesItem(item, ctx, false));
  const loose = items.length >= 3 ? items : WARDROBE.filter((item) => slots.includes(item.slot) && passesItem(item, ctx, true));
  return shuffle(loose, rnd);
}

export function initialReels(outfit: Outfit, ctx: Ctx, history: History, seed: string, baseline: boolean): Reel[] {
  const slots: Slot[] = [];
  if (outfit.bySlot.outer || ctx.outer === "required") slots.push("outer");
  slots.push("top", "bottom", "shoes");
  return slots.map((slot) => {
    const current = slot === "top" ? (outfit.bySlot.onePiece ?? outfit.bySlot.top) : outfit.bySlot[slot];
    const rest = baseline
      ? baselineItems(slot, ctx, seed).filter((item) => item.id !== current?.id)
      : alternatives(slot, outfitItems(outfit), ctx, history, `${seed}:${slot}`, 14).filter((item) => item.id !== current?.id);
    const items = current ? [current, ...rest] : rest;
    return { slot, items, index: 0, pinned: false };
  });
}

export function reelSelection(reels: Reel[]): Item[] {
  const selected = reels
    .map((reel) => reel.items[reel.index])
    .filter((item): item is Item => Boolean(item));
  const one = selected.find((item) => item.slot === "onePiece");
  if (!one) return selected;
  return selected.filter((item) => item.slot !== "bottom" && item.slot !== "top");
}

export function rerankAhead(reels: Reel[], changed: Slot, ctx: Ctx, history: History, seed: string): Reel[] {
  const current = reelSelection(reels);
  return reels.map((reel) => {
    if (reel.pinned || reel.slot === changed) return reel;
    const past = reel.items.slice(0, reel.index + 1);
    const pastIds = new Set(past.map((item) => item.id));
    const ahead = alternatives(reel.slot, current, ctx, history, `${seed}:ahead:${reel.slot}:${past.map((item) => item.id).join(".")}`, 16).filter(
      (item) => !pastIds.has(item.id),
    );
    return { ...reel, items: [...past, ...ahead] };
  });
}

export function createsNovel(history: History, item: Item, others: Item[]): boolean {
  return others.some((other) => other.id !== item.id && pairNovelty(history, item.id, other.id) >= 0.99);
}

export function hardOk(items: Item[]): boolean {
  return violations(items).length === 0;
}

export function savedWith(history: History, id: string): number {
  return history.shown.filter((entry) => entry.saved && entry.ids.includes(id)).length;
}
