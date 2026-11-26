export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFrom(parts: (string | number)[]): () => number {
  return makeRng(hashString(parts.join("|")));
}

export function weightedPick<T>(items: T[], weights: number[], rnd: () => number): T {
  let sum = 0;
  for (const w of weights) sum += w > 0 ? w : 0;
  if (sum <= 0 || items.length === 0) return items[Math.floor(rnd() * items.length) % items.length];
  let r = rnd() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i] > 0 ? weights[i] : 0;
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
