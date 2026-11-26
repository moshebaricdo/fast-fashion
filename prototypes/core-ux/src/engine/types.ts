export type Slot = "top" | "bottom" | "onePiece" | "shoes" | "outer";

export type Pattern = "solid" | "stripe" | "print" | "texture" | "check";

export type Style = "casual" | "smart" | "athletic";

export type ColorFamily =
  | "white"
  | "black"
  | "grey"
  | "navy"
  | "beige"
  | "brown"
  | "denim"
  | "olive"
  | "rust"
  | "blue";

export type Silhouette =
  | "oxford"
  | "knit"
  | "polo"
  | "overshirt"
  | "tee"
  | "camp"
  | "quarterzip"
  | "trousers"
  | "shorts"
  | "dress"
  | "jumpsuit"
  | "sneaker"
  | "loafer"
  | "derby"
  | "boot"
  | "chelsea"
  | "runner"
  | "jacket"
  | "coat"
  | "hoodie"
  | "puffer"
  | "shell";

export interface ItemColor {
  family: ColorFamily;
  hex: string;
  share: number;
}

export interface Item {
  id: string;
  name: string;
  short: string;
  slot: Slot;
  subcategoryKey: string;
  style: Style;
  formality: 1 | 2 | 3 | 4 | 5;
  /** Shoes have no warmth target; stored as 1 and ignored by weather filters. */
  warmth: 0 | 1 | 2 | 3;
  colors: ItemColor[];
  pattern: Pattern;
  isWaterResistant: boolean;
  /** Suede and canvas: a hard miss when rain is forecast. */
  isRainSensitive: boolean;
  isFavorite: boolean;
  staple: boolean;
  silhouette: Silhouette;
}

export type ScenarioId = "thu" | "sat" | "mon" | "wed";

export type Mode = "inferred" | "casual" | "formal" | "athletic";

export type OuterPolicy = "none" | "optional" | "required";

export interface Ctx {
  scenario: ScenarioId;
  day: number;
  weekdayIndex: number;
  weekdayShort: string;
  dayLabel: string;
  low: number;
  high: number;
  rain: boolean;
  rainHour: number | null;
  windy: boolean;
  humid: boolean;
  center: number;
  warmth: number;
  outer: OuterPolicy;
  /** 0 familiar … 1 fresh. The hidden Tuning Pad x-axis. */
  novelty: number;
  mode: Mode;
}

export interface PairStat {
  shown: number;
  saved: number;
  lastShownDay: number;
}

export interface ShownEntry {
  day: number;
  signature: string;
  ids: string[];
  saved: boolean;
}

export interface History {
  shown: ShownEntry[];
  pairs: Record<string, PairStat>;
  itemShown: Record<string, number>;
  itemLastDay: Record<string, number>;
}

export interface Scores {
  color: number;
  formality: number;
  weather: number;
  recency: number;
  variety: number;
  favorite: number;
  novelty: number;
  pattern: number;
  total: number;
}

export type ReasonKind =
  | "novelPair"
  | "color"
  | "weather"
  | "rediscover"
  | "formality"
  | "anchor"
  | "familiar";

export interface Reason {
  kind: ReasonKind;
  weight: number;
  a?: string;
  b?: string;
  text: string;
}

export type Angle = "safe" | "novel" | "rediscover" | "weather" | "remix";

export interface Outfit {
  bySlot: Partial<Record<Slot, Item>>;
  ids: string[];
  signature: string;
  scores: Scores;
  novelPairs: number;
  reasons: Reason[];
  angle: Angle;
  /** Steps of dressier (+) or easier (−) from the prepared look. */
  formalityDelta: number;
}

export interface Look {
  outfit: Outfit;
  eyebrow: string;
  headline: string;
  line: string;
}

export const RECENCY_DAYS = 4;
export const MAX_NOVEL_PAIRS = 2;
