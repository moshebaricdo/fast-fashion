import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useSearchParams } from "react-router-dom";
import { Garment } from "../components/Garment";
import { HomeBar, SaveButton, StatusBar, TabStandIn, Toast, WeatherMark } from "../components/Chrome";
import { buildReasons } from "../engine/explain";
import {
  alternatives,
  baselineItems,
  contextEyebrow,
  createsNovel,
  initialReels,
  reelSelection,
  rerankAhead,
  suggestOutfit,
  type Reel,
} from "../engine/generate";
import type { Item, Mode, Slot } from "../engine/types";
import { useFrozenHistory, useStudio } from "../studio";
import { stopped, tick } from "../ui";

const MODES: { id: Mode; label: string }[] = [
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
  { id: "athletic", label: "Athletic" },
];

export function SmartReels() {
  const studio = useStudio();
  const frozen = useFrozenHistory();
  const [params] = useSearchParams();
  const baseline = params.get("baseline") === "1";
  const [mode, setMode] = useState<Mode>("casual");
  const ctx = studio.context(baseline ? mode : "inferred");
  const key = `${studio.ready}|${studio.epoch}|${studio.seed}|${baseline}|${baseline ? mode : "inferred"}`;
  const [reels, setReels] = useState<Reel[]>([]);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pull, setPull] = useState(0);
  const [spin, setSpin] = useState<{ slot: Slot; item: Item } | null>(null);
  const undo = useRef<Reel[][]>([]);
  const hold = useRef<number | null>(null);
  const spinning = useRef(false);

  useEffect(() => {
    if (!studio.ready) return;
    const outfit = suggestOutfit(frozen, ctx, studio.seed + (baseline ? mode : ""));
    if (!outfit) return;
    setReels(initialReels(outfit, ctx, frozen, studio.seed, baseline));
    setSaved(false);
    studio.log(baseline ? "baseline" : "reels", "open", { signature: outfit.signature });
    // Rebuild only when the morning, mode, or variant changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const items = reelSelection(reels);
  const caption = captionFor(items, baseline, mode, studio);

  const commitIndex = (slot: Slot, nextIndex: number) => {
    const reel = reels.find((entry) => entry.slot === slot);
    if (!reel) return;
    const index = Math.max(0, Math.min(reel.items.length - 1, nextIndex));
    if (index === reel.index) return;
    undo.current.push(reels);
    let next = reels.map((entry) => (entry.slot === slot ? { ...entry, index } : entry));
    const landed = next.find((entry) => entry.slot === slot)?.items[index];
    const previous = reel.items[reel.index];
    let shift = studio.sessionShift;
    if (!baseline && landed && previous && Math.abs(landed.formality - previous.formality) >= 1) {
      shift = Math.max(-1.5, Math.min(1.5, shift + (landed.formality > previous.formality ? 0.45 : -0.45)));
      studio.setShift(shift);
    }
    if (!baseline) next = rerankAhead(next, slot, studio.context("inferred", shift), studio.history, studio.seed);
    setReels(next);
    setSaved(false);
    tick(8);
    studio.log(baseline ? "baseline" : "reels", "swipe", { slot });
  };

  const togglePin = (slot: Slot) => {
    if (baseline) return;
    setReels((current) => current.map((reel) => (reel.slot === slot ? { ...reel, pinned: !reel.pinned } : reel)));
    tick(16);
    studio.log("reels", "pin", { slot });
  };

  const respin = async () => {
    if (spinning.current) return;
    spinning.current = true;
    studio.log(baseline ? "baseline" : "reels", "respin", {});
    let working = reels;
    const order = working.filter((reel) => !reel.pinned);
    for (const reel of order) {
      const pool = baseline
        ? baselineItems(reel.slot, ctx, `${studio.seed}:spin:${reel.slot}:${Date.now()}`)
        : alternatives(reel.slot, reelSelection(working), studio.context(), studio.history, `${studio.seed}:spin:${reel.slot}`, 8);
      const sequence = pool.slice(0, 4);
      const land = sequence[sequence.length - 1];
      if (!land) continue;
      let delay = 70;
      for (const frame of sequence) {
        setSpin({ slot: reel.slot, item: frame });
        await wait(delay);
        delay += 70;
      }
      working = working.map((entry) =>
        entry.slot === reel.slot ? { ...entry, items: [land, ...pool.filter((item) => item.id !== land.id)], index: 0 } : entry,
      );
      if (!baseline) working = rerankAhead(working, reel.slot, studio.context(), studio.history, studio.seed);
      setReels(working);
      setSpin(null);
    }
    setSaved(false);
    spinning.current = false;
  };

  const bindStack = useDrag(
    ({ movement: [mx, my], last, event }) => {
      if (stopped(event.target)) return;
      if (my > 12 && my > Math.abs(mx)) setPull(Math.min(my, 120));
      if (last) {
        if (pull > 72 || my > 84) void respin();
        setPull(0);
      }
    },
  );

  const save = () => {
    if (items.length < 2) return;
    studio.saveLook(items.map((item) => item.id));
    setSaved(true);
    const novel = items.some((item) => createsNovel(studio.history, item, items));
    setToast(novel ? "Added to your repertoire." : "Saved to Everyday.");
    studio.log(baseline ? "baseline" : "reels", "save", { ids: items.map((item) => item.id) });
    tick(20);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const top = reels.find((reel) => reel.slot === "top");
      if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && top) {
        commitIndex("top", top.index + (event.key === "ArrowRight" ? 1 : -1));
      }
      if (event.key === "s" || event.key === "S") save();
      if (event.key === "z" || event.key === "Z") {
        const prev = undo.current.pop();
        if (prev) setReels(prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const spanned = items.some((item) => item.slot === "onePiece");

  return (
    <div className="screen">
      <StatusBar backTo={backHref()} />
      <div className="reels" data-testid={baseline ? "baseline-screen" : "reels-screen"}>
        <p className="eyebrow">{contextEyebrow(studio.context())}</p>
        {baseline && (
          <div className="chips" data-gesture-stop>
            {MODES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={mode === entry.id ? "chip on" : "chip"}
                data-testid={`mode-${entry.id}`}
                aria-pressed={mode === entry.id}
                onClick={() => setMode(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
        <div
          className="reel-stack"
          data-testid="reel-stack"
          style={{ transform: `translateY(${pull * 0.35}px)` }}
          {...bindStack()}
        >
          {reels.map((reel) => {
            if (spanned && reel.slot === "bottom") return null;
            const shown = spin?.slot === reel.slot ? spin.item : reel.items[reel.index];
            if (!shown) return null;
            const others = items.filter((item) => item.id !== shown.id);
            return (
              <ReelRow
                key={reel.slot}
                reel={reel}
                item={shown}
                novel={!baseline && createsNovel(studio.history, shown, others)}
                tall={spanned && (reel.slot === "top" || shown.slot === "onePiece")}
                onStep={(direction) => commitIndex(reel.slot, reel.index + direction)}
                onPin={() => togglePin(reel.slot)}
                hold={hold}
              />
            );
          })}
        </div>
        <p className="line" data-testid="reel-caption">
          {caption}
        </p>
        {studio.showScores && <p className="scores">{items.map((item) => item.short).join(" · ")}</p>}
        {pull > 30 && <p className="pull-label">{pull > 72 ? "Release to respin" : "Pull to respin"}</p>}
        <SaveButton saved={saved} onClick={save} />
      </div>
      <WeatherMark />
      <TabStandIn />
      <HomeBar />
      {toast && <Toast title={toast} />}
    </div>
  );
}

function ReelRow({
  reel,
  item,
  novel,
  tall,
  onStep,
  onPin,
  hold,
}: {
  reel: Reel;
  item: Item;
  novel: boolean;
  tall: boolean;
  onStep: (direction: number) => void;
  onPin: () => void;
  hold: MutableRefObject<number | null>;
}) {
  const bind = useDrag(
    ({ first, last, movement: [mx], velocity: [vx], direction: [dx], event }) => {
      if (stopped(event.target)) return;
      if (first) {
        if (hold.current) window.clearTimeout(hold.current);
        hold.current = window.setTimeout(() => onPin(), 480);
      }
      if (Math.abs(mx) > 8 && hold.current) {
        window.clearTimeout(hold.current);
        hold.current = null;
      }
      if (last) {
        if (hold.current) window.clearTimeout(hold.current);
        if (mx < -36 || (mx < -16 && vx > 0.45 && dx < 0)) onStep(1);
        else if (mx > 36 || (mx > 16 && vx > 0.45 && dx > 0)) onStep(-1);
      }
    },
    { axis: "x" },
  );

  return (
    <div className={tall ? "reel tall" : "reel"} data-testid={`reel-${reel.slot}`}>
      <button type="button" className="nudge" aria-label="Previous" data-gesture-stop onClick={() => onStep(-1)}>
        ‹
      </button>
      <div className="reel-card" {...bind()}>
        <span className="well">
          <Garment item={item} />
          {novel && <i className="novel-dot" />}
          {reel.pinned && <i className="pin" aria-label="Pinned" />}
        </span>
        <span className="slot-name" data-testid={reel.slot === "top" ? "reel-top-name" : undefined}>
          {item.short}
        </span>
      </div>
      <button type="button" className="nudge" aria-label="Next" data-gesture-stop onClick={() => onStep(1)}>
        ›
      </button>
    </div>
  );
}

function captionFor(
  items: Item[],
  baseline: boolean,
  mode: Mode,
  studio: ReturnType<typeof useStudio>,
): string {
  if (items.length === 0) return "";
  if (baseline) return `Shuffled for ${mode}.`;
  const novel = findNovel(items, studio);
  if (novel) return `New: ${novel[0].short} × ${novel[1].short}`;
  const reasons = buildReasons(items, studio.context(), studio.history, "remix", 0);
  return reasons[0]?.text ?? "A complete outfit.";
}

function findNovel(items: Item[], studio: ReturnType<typeof useStudio>): [Item, Item] | null {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      if (createsNovel(studio.history, items[i], [items[j]])) return [items[i], items[j]];
    }
  }
  return null;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function backHref(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete("baseline");
  const text = params.toString();
  return text ? `/?${text}` : "/";
}
