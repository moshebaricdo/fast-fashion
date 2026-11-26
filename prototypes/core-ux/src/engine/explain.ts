import { countNovelPairs, pairNovelty } from "./history";
import { dominant, familyScore, isNeutral } from "./rules";
import { hashString } from "./rng";
import type { Angle, Ctx, History, Item, Outfit, Reason, ReasonKind } from "./types";

const COLOR_WORD: Record<string, string> = {
  white: "white",
  black: "black",
  grey: "grey",
  navy: "navy",
  beige: "cream",
  brown: "tan",
  denim: "denim",
  olive: "olive",
  rust: "rust",
  blue: "blue",
};

function pick(seed: string, options: string[]): string {
  const i = hashString(seed) % options.length;
  return options[i];
}

function novelLine(a: Item, b: Item, seed: string): string {
  const options = [
    `First time your ${a.short.toLowerCase()} meets ${b.short.toLowerCase()}.`,
    `Never paired: ${a.short.toLowerCase()} with ${b.short.toLowerCase()}.`,
    `${a.short} and ${b.short}, together for the first time.`,
    `A first: ${a.short.toLowerCase()} × ${b.short.toLowerCase()}.`,
  ];
  return pick(seed + "novel", options);
}

function colorLine(a: Item, b: Item, seed: string): string {
  const fa = COLOR_WORD[dominant(a)] ?? dominant(a);
  const fb = COLOR_WORD[dominant(b)] ?? dominant(b);
  const rel = familyScore(dominant(a), dominant(b));
  if (!isNeutral(dominant(a)) && !isNeutral(dominant(b)) && rel > 0.4) {
    return pick(seed + "color", [
      `${cap(fa)} and ${fb} sit next to each other on the colour wheel.`,
      `Neighbours on the colour wheel: ${fa} and ${fb}.`,
      `${cap(fa)} beside ${fb} — a close colour pair.`,
    ]);
  }
  if (dominant(a) === dominant(b)) {
    return pick(seed + "tonal", [
      "One colour story, in different weights.",
      "Tonal: the same family, different cloth.",
      "A single colour, head to toe.",
    ]);
  }
  return pick(seed + "neutral", [
    "Neutrals doing the quiet work.",
    "A quiet base, nothing competing.",
    "Calm colours, nothing shouting.",
  ]);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildReasons(items: Item[], ctx: Ctx, history: History, angle: Angle, delta: number): Reason[] {
  const reasons: Reason[] = [];
  let bestNovel: { a: Item; b: Item } | null = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (pairNovelty(history, items[i].id, items[j].id) >= 0.99) {
        if (!bestNovel) bestNovel = { a: items[i], b: items[j] };
      }
    }
  }
  if (bestNovel) {
    const line = novelLine(bestNovel.a, bestNovel.b, items.map((i) => i.id).join("."));
    reasons.push({
      kind: "novelPair",
      weight: angle === "novel" || angle === "remix" ? 1.25 : 0.9,
      a: bestNovel.a.id,
      b: bestNovel.b.id,
      text: line,
    });
  }

  let bestColor: { a: Item; b: Item; s: number } | null = null;
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const s = familyScore(dominant(items[i]), dominant(items[j]));
      if (!bestColor || s > bestColor.s) bestColor = { a: items[i], b: items[j], s };
    }
  }
  if (bestColor) {
    reasons.push({
      kind: "color",
      weight: 0.62,
      a: bestColor.a.id,
      b: bestColor.b.id,
      text: colorLine(bestColor.a, bestColor.b, items.map((i) => i.id).join(".")),
    });
  }

  const outer = items.find((i) => i.slot === "outer");
  if (outer && (ctx.rain || ctx.low <= 6 || ctx.windy)) {
    const text = ctx.rain
      ? pick(outer.id + "rain", [
          `${outer.short}, since rain starts at ${ctx.rainHour ?? 3}.`,
          `Rain after ${ctx.rainHour ?? 3}, so the ${outer.short.toLowerCase()}.`,
          `${outer.short} for the wet walk home.`,
        ])
      : ctx.low <= 6
        ? pick(outer.id + "cold", [
            `${outer.short} — it's ${ctx.low}° this morning.`,
            `Cold start. The ${outer.short.toLowerCase()} earns its place.`,
            `${outer.short}, because ${ctx.low}° needs a real coat.`,
          ])
        : pick(outer.id + "wind", [
            `${outer.short}, the wind is up.`,
            `Windy and ${ctx.high}°. ${outer.short} stays on.`,
            `${outer.short} against the wind.`,
          ]);
    reasons.push({ kind: "weather", weight: angle === "weather" ? 1.3 : 0.84, a: outer.id, text });
  }

  const rare = [...items].sort((a, b) => (history.itemShown[a.id] ?? 0) - (history.itemShown[b.id] ?? 0))[0];
  if (rare && (history.itemShown[rare.id] ?? 0) === 0) {
    reasons.push({
      kind: "rediscover",
      weight: angle === "rediscover" ? 1.35 : 0.7,
      a: rare.id,
      text: pick(rare.id + "red", [
        `${rare.short} hasn't been out at all.`,
        `A piece you own and never see: ${rare.short.toLowerCase()}.`,
        `Pulling ${rare.short.toLowerCase()} into the week.`,
      ]),
    });
  }

  if (delta !== 0) {
    const shoes = items.find((i) => i.slot === "shoes");
    const text =
      delta > 0
        ? pick("up" + (shoes?.id ?? ""), [
            shoes ? `${shoes.short} sharpen it.` : "A step dressier, same idea.",
            "Same idea, a sharper edge.",
            "Dressier, without starting over.",
          ])
        : pick("down" + (shoes?.id ?? ""), [
            shoes ? `${shoes.short} ease it off.` : "Easier, same idea.",
            "Same story, less starched.",
            "A notch easier, still put-together.",
          ]);
    reasons.push({ kind: "formality", weight: 1.4, a: shoes?.id, text });
  }

  if (countNovelPairs(history, items.map((i) => i.id)) === 0 && delta === 0) {
    const text =
      ctx.dayLabel === "workday"
        ? pick(ctx.scenario + "fam", [
            "A quiet, warm workday.",
            "The sure thing, still sharp.",
            "Familiar, and it fits the day.",
            "Nothing to decide. Walk out.",
          ])
        : pick(ctx.scenario + "easy", [
            "Your easy version of this day.",
            "Soft pieces, already yours.",
            "Nothing fussy. It already works.",
            "A familiar Saturday shape.",
          ]);
    reasons.push({ kind: "familiar", weight: angle === "safe" ? 0.8 : 0.4, text });
  }

  reasons.sort((a, b) => b.weight - a.weight);
  return reasons;
}

export function headlineFor(reason: Reason, items: Item[], ctx: Ctx): string {
  if (reason.kind === "novelPair" && reason.a && reason.b) {
    const a = items.find((i) => i.id === reason.a);
    const b = items.find((i) => i.id === reason.b);
    if (a && b) {
      const top = a.slot === "top" || a.slot === "onePiece" ? a : b;
      const other = top === a ? b : a;
      const fa = COLOR_WORD[dominant(other)] ?? "";
      const fb = COLOR_WORD[dominant(top)] ?? "";
      if (fa && fb && !isNeutral(dominant(other)) && !isNeutral(dominant(top)) && fa !== fb) {
        return `${cap(fa)} on ${fb}`;
      }
      return `New with ${top.short.split(" ")[0].toLowerCase()}`;
    }
  }
  if (reason.kind === "weather") {
    if (ctx.rain) return "Built for the rain";
    if (ctx.low <= 6) return "A real coat day";
    if (ctx.high >= 26) return "Light, on purpose";
    return "Weather, handled";
  }
  if (reason.kind === "rediscover") {
    const item = items.find((i) => i.id === reason.a);
    return item ? `${item.short.split(" ").slice(0, 2).join(" ")}, again` : "From the back";
  }
  if (reason.kind === "formality") return reason.weight > 0 && reason.text.includes("ease") ? "Easier, same idea" : "Sharper, same idea";
  if (reason.kind === "anchor") return "Another way";
  if (ctx.high >= 26) return "Light for the heat";
  if (ctx.low <= 6) return "Warm, not heavy";
  if (ctx.dayLabel !== "workday") return "Easy, and yours";
  return "A quiet workday";
}

export function eyebrowFor(angle: Angle, ctx: Ctx, reason: ReasonKind): string {
  if (reason === "formality") return "SAME IDEA";
  if (angle === "novel" || angle === "remix") return angle === "remix" ? "YOUR CLASSIC, REMIXED" : "NEW PAIRING";
  if (angle === "rediscover") return "REDISCOVER";
  if (angle === "weather") {
    if (ctx.rain) return "RAIN-READY";
    if (ctx.low <= 6) return "COLD-READY";
    if (ctx.high >= 26) return "HEAT-WISE";
    return "WEATHER-LED";
  }
  return "";
}

export function anchorReason(anchor: Item, history: History, companion: Item | undefined, novel: boolean): Reason {
  const saves = history.shown.filter((s) => s.saved && s.ids.includes(anchor.id));
  const companions = new Map<string, number>();
  for (const save of saves) {
    for (const id of save.ids) {
      if (id === anchor.id) continue;
      companions.set(id, (companions.get(id) ?? 0) + 1);
    }
  }
  let topId = "";
  let topN = 0;
  for (const [id, n] of companions) {
    if (n > topN) {
      topN = n;
      topId = id;
    }
  }
  if (saves.length >= 2 && topN >= 2 && !novel) {
    const other = topId === "jeans" ? "jeans" : topId.replace(/-/g, " ");
    const noun = anchor.short.split(" ").slice(-1)[0].toLowerCase();
    return {
      kind: "anchor",
      weight: 1.3,
      a: anchor.id,
      b: topId,
      text: `You've saved this ${noun} twice, both times with ${other}.`,
    };
  }
  if (novel && companion) {
    return {
      kind: "novelPair",
      weight: 1.2,
      a: anchor.id,
      b: companion.id,
      text: novelLine(anchor, companion, anchor.id + companion.id),
    };
  }
  return {
    kind: "anchor",
    weight: 1,
    a: anchor.id,
    text: `Built around your ${anchor.short.toLowerCase()}.`,
  };
}

export function lineOk(text: string): boolean {
  return text.length > 0 && text.length <= 70;
}

export function topReason(outfit: Outfit): Reason {
  return outfit.reasons[0] ?? { kind: "familiar", weight: 0, text: "A complete outfit." };
}
