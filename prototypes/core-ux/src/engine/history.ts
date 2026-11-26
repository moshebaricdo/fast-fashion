import { ITEM_MAP } from "../data/wardrobe";
import type { History, Item, ShownEntry } from "./types";
import { RECENCY_DAYS } from "./types";

export function signature(ids: string[]): string {
  return [...ids].sort().join("|");
}

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function emptyHistory(): History {
  return { shown: [], pairs: {}, itemShown: {}, itemLastDay: {} };
}

export function cloneHistory(h: History): History {
  return {
    shown: h.shown.map((s) => ({ ...s, ids: [...s.ids] })),
    pairs: Object.fromEntries(Object.entries(h.pairs).map(([k, v]) => [k, { ...v }])),
    itemShown: { ...h.itemShown },
    itemLastDay: { ...h.itemLastDay },
  };
}

/** Record a shown outfit. Saves also count as shown. Idempotent for the same signature on the same day. */
export function recordShown(history: History, ids: string[], day: number, saved = false): History {
  const sig = signature(ids);
  const next = cloneHistory(history);
  const existing = next.shown.find((s) => s.signature === sig && s.day === day);
  if (!existing) {
    const entry: ShownEntry = { day, signature: sig, ids: [...ids], saved };
    next.shown.push(entry);
    for (const id of ids) {
      next.itemShown[id] = (next.itemShown[id] ?? 0) + 1;
      const prev = next.itemLastDay[id];
      if (prev === undefined || day > prev) next.itemLastDay[id] = day;
    }
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j]);
        const stat = next.pairs[key] ?? { shown: 0, saved: 0, lastShownDay: day };
        stat.shown += 1;
        if (saved) stat.saved += 1;
        stat.lastShownDay = Math.max(stat.lastShownDay, day);
        next.pairs[key] = stat;
      }
    }
  } else if (saved && !existing.saved) {
    existing.saved = true;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = pairKey(ids[i], ids[j]);
        const stat = next.pairs[key];
        if (stat) stat.saved += 1;
      }
    }
  }
  return next;
}

export function outfitBlocked(history: History, ids: string[], today: number): boolean {
  const sig = signature(ids);
  return history.shown.some((s) => s.signature === sig && today - s.day >= 0 && today - s.day <= RECENCY_DAYS);
}

/** 0 outside the window. Strong inside it, still meaningful on day 4. */
export function itemRecency(history: History, id: string, today: number): number {
  const last = history.itemLastDay[id];
  if (last === undefined) return 0;
  const age = today - last;
  if (age < 0 || age > RECENCY_DAYS) return 0;
  return [1.8, 1.55, 1.25, 1.0, 0.8][age] ?? 0;
}

export function pairNovelty(history: History, a: string, b: string): number {
  const stat = history.pairs[pairKey(a, b)];
  if (!stat || (stat.shown === 0 && stat.saved === 0)) return 1;
  if (stat.saved > 0) return 0.05;
  return 1 / (1 + stat.shown);
}

export function countNovelPairs(history: History, ids: string[]): number {
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (pairNovelty(history, ids[i], ids[j]) >= 0.99) n += 1;
    }
  }
  return n;
}

export function itemsFromIds(ids: string[]): Item[] {
  return ids.map((id) => {
    const item = ITEM_MAP[id];
    if (!item) throw new Error(`Unknown item ${id}`);
    return item;
  });
}

/**
 * Seeded pair history. Staples dominate. Two pieces (blue oxford, stone chinos)
 * are never shown. The rust overshirt is saved twice, both times with jeans.
 * Recent days (−4…−1) are staple repeats so those shirts sit in the recency window.
 * Bridge outfits that make today's angles legal live on day −6 and older.
 */
export function seedHistory(): History {
  let h = emptyHistory();
  const add = (day: number, ids: string[], saved = false) => {
    h = recordShown(h, ids, day, saved);
  };

  add(-1, ["oxford", "navy-trousers", "derbys"]);
  add(-1, ["navy-knit", "jeans", "sneakers"]);
  add(-2, ["grey-tee", "jeans", "sneakers"]);
  add(-2, ["oxford", "flannel", "derbys"]);
  add(-3, ["white-tee", "black-jeans", "canvas"]);
  add(-3, ["navy-knit", "navy-trousers", "sneakers"]);
  add(-4, ["grey-tee", "jeans", "canvas"]);
  add(-4, ["white-tee", "jeans", "sneakers"]);

  add(-12, ["navy-knit", "jeans", "sneakers"], true);
  add(-13, ["oxford", "navy-trousers", "sneakers"], true);
  add(-14, ["grey-tee", "jeans", "sneakers"], true);
  add(-15, ["white-tee", "jeans", "sneakers"], true);
  add(-18, ["rust", "jeans", "desert"], true);
  add(-19, ["rust", "jeans", "desert"], true);

  add(-6, ["navy-knit", "jeans", "sneakers"]);
  add(-7, ["oxford", "navy-trousers", "sneakers"]);
  add(-8, ["grey-tee", "jeans", "sneakers"]);
  add(-9, ["navy-knit", "jeans", "sneakers"]);
  add(-10, ["oxford", "navy-trousers", "sneakers"]);
  add(-16, ["white-tee", "jeans", "sneakers"]);
  add(-17, ["navy-knit", "black-jeans", "sneakers"]);
  add(-21, ["grey-tee", "jeans", "sneakers"]);
  add(-23, ["black-tee", "black-jeans", "sneakers"]);
  add(-25, ["breton", "jeans", "canvas"]);

  add(-26, ["cream-knit", "olive-chinos", "desert"]);
  add(-27, ["cream-knit", "olive-chinos", "loafers"]);
  add(-28, ["polo", "olive-chinos", "chelsea"]);
  add(-30, ["rust", "jeans", "chelsea"]);
  add(-31, ["waxed", "polo", "flannel", "chelsea"]);
  add(-32, ["waxed", "cream-knit", "olive-chinos", "chelsea"]);
  add(-33, ["peacoat", "cream-knit", "flannel", "derbys"]);
  add(-34, ["camel", "polo", "flannel", "loafers"]);
  add(-35, ["camp", "olive-chinos", "desert"]);
  add(-36, ["quarterzip", "track", "runners"]);
  add(-37, ["dress", "loafers"]);
  add(-38, ["jumpsuit", "sneakers"]);
  add(-39, ["hoodie", "white-tee", "jeans", "sneakers"]);
  add(-40, ["trucker", "breton", "jeans", "sneakers"]);
  add(-41, ["puffer", "grey-tee", "jeans", "chelsea"]);
  add(-42, ["shell", "quarterzip", "track", "runners"]);
  add(-43, ["camp", "shorts", "canvas"]);

  return h;
}

const STORAGE_KEY = "ff.coreux.v1";

export interface Persisted {
  history: History;
  logs: LogEvent[];
  scenario: string;
  day: number;
  novelty: number;
  reopened: boolean;
}

export interface LogEvent {
  t: number;
  prototype: string;
  type: string;
  detail?: unknown;
}

export function loadPersisted(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Persisted;
    if (!parsed.history || !Array.isArray(parsed.history.shown)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePersisted(data: Persisted) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

export function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}
