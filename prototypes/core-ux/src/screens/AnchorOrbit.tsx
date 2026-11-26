import { useDrag } from "@use-gesture/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Garment } from "../components/Garment";
import { HomeBar, SaveButton, StatusBar, TabStandIn, Toast, WeatherMark } from "../components/Chrome";
import { Rail } from "../components/Rail";
import { WARDROBE } from "../data/wardrobe";
import { anchorReason } from "../engine/explain";
import {
  alternatives,
  anchorCandidates,
  completions,
  contextEyebrow,
  createsNovel,
  replaceSlot,
  restingIndex,
  toLook,
} from "../engine/generate";
import { formatScores } from "../engine/score";
import type { Item, Outfit, Slot } from "../engine/types";
import { useFrozenHistory, useStudio } from "../studio";
import { stopped, tick } from "../ui";

export function AnchorOrbit() {
  const studio = useStudio();
  const frozen = useFrozenHistory();
  const ctx = studio.context();
  const key = `${studio.ready}|${studio.epoch}|${studio.seed}`;
  const anchors = useMemo(() => anchorCandidates(ctx, frozen, studio.seed), [key, frozen, studio.seed, ctx.center, ctx.scenario]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [custom, setCustom] = useState<Item | null>(null);
  const [picker, setPicker] = useState(false);
  const [index, setIndex] = useState(0);
  const [rail, setRail] = useState<{ slot: Slot; items: Item[] } | null>(null);
  const [override, setOverride] = useState<Outfit | null>(null);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [shift, setShift] = useState(0);
  const undo = useRef<Outfit[]>([]);

  const roster = custom ? [custom, ...anchors.filter((item) => item.id !== custom.id)] : anchors;
  const anchor = roster.find((item) => item.id === anchorId) ?? roster[0];
  const sets = useMemo(
    () => (anchor ? completions(anchor, ctx, frozen, studio.seed) : []),
    [anchor?.id, key, frozen, studio.seed, ctx.center],
  );

  useEffect(() => {
    if (!anchor) return;
    setIndex(restingIndex(sets, ctx));
    setOverride(null);
    setSaved(false);
    studio.log("orbit", "anchor", { id: anchor.id });
    // Reset the dial when the anchor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor?.id, key]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const active = override ?? sets[index] ?? null;

  const stepAnchor = (direction: number) => {
    if (roster.length === 0) return;
    const current = Math.max(0, roster.findIndex((item) => item.id === anchor?.id));
    const next = current + direction;
    if (next >= roster.length) {
      setPicker(true);
      return;
    }
    if (next < 0) return;
    setAnchorId(roster[next].id);
    setPicker(false);
    tick();
  };

  const bindAnchor = useDrag(
    ({ last, movement: [mx], event }) => {
      if (stopped(event.target)) return;
      setShift(last ? 0 : mx);
      if (!last) return;
      if (mx < -48) stepAnchor(1);
      else if (mx > 48) stepAnchor(-1);
    },
    { axis: "x" },
  );

  const bindDial = useDrag(
    ({ first, movement: [mx], memo, event }) => {
      if (stopped(event.target) || sets.length === 0) return memo;
      if (first) memo = index;
      const next = Math.max(0, Math.min(sets.length - 1, Math.round((memo as number) + mx / 46)));
      if (next !== index) {
        setIndex(next);
        setOverride(null);
        tick(8);
        studio.log("orbit", "dial", { index: next });
      }
      return memo;
    },
    { axis: "x" },
  );

  const save = () => {
    if (!active) return;
    studio.saveLook(active.ids);
    setSaved(true);
    setToast(active.novelPairs > 0 ? "Added to your repertoire." : "Saved to Everyday.");
    studio.log("orbit", "save", { signature: active.signature });
    tick(20);
  };

  const undoLast = () => {
    const prev = undo.current.pop();
    if (prev) setOverride(prev);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(sets.length - 1, current + 1));
        setOverride(null);
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(0, current - 1));
        setOverride(null);
      }
      if (event.key === "ArrowUp") stepAnchor(-1);
      if (event.key === "ArrowDown") stepAnchor(1);
      if (event.key === "s" || event.key === "S") save();
      if (event.key === "z" || event.key === "Z") undoLast();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!anchor || !active) {
    return (
      <div className="screen">
        <StatusBar backTo={backHref()} />
        <p className="line">No anchor fits this day.</p>
      </div>
    );
  }

  const companions = (["outer", "bottom", "shoes"] as Slot[])
    .map((slot) => active.bySlot[slot])
    .filter((item): item is Item => Boolean(item));
  const novelCompanion = companions.find((item) => createsNovel(studio.history, anchor, [item]));
  const reason = anchorReason(anchor, studio.history, novelCompanion ?? companions[0], Boolean(novelCompanion));
  const line = active.novelPairs > 0 && active.reasons[0] ? active.reasons[0].text : reason.text;

  return (
    <div className="screen">
      <StatusBar backTo={backHref()} />
      <div className="orbit">
        <p className="eyebrow">{contextEyebrow(ctx)}</p>
        <p className="kicker">Built around</p>
        <div className="hero" data-testid="orbit-anchor" style={{ transform: `translateX(${shift * 0.25}px)` }} {...bindAnchor()}>
          <span className="well large">
            <Garment item={anchor} />
          </span>
          <h2>Your {anchor.short.toLowerCase()}</h2>
        </div>
        {picker ? (
          <WardrobePick
            onPick={(item) => {
              setCustom(item);
              setAnchorId(item.id);
              setPicker(false);
            }}
            onClose={() => setPicker(false)}
          />
        ) : (
          <>
            <div className="companions">
              {companions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="companion"
                  data-testid="orbit-companion"
                  onClick={() => {
                    const given = [anchor, ...companions];
                    setRail({ slot: item.slot, items: alternatives(item.slot, given, ctx, studio.history, studio.seed, 8) });
                  }}
                >
                  <span className="well">
                    <Garment item={item} />
                    {createsNovel(studio.history, anchor, [item]) && <i className="novel-dot" />}
                  </span>
                  <span className="slot-name">{item.short}</span>
                </button>
              ))}
            </div>
            <div className="dial" data-testid="orbit-dial" {...bindDial()}>
              <svg viewBox="0 0 320 74" className="dial-arc" aria-hidden>
                <path d="M16 62 Q160 4 304 62" fill="none" stroke="#E4DCD2" strokeWidth="3" />
              </svg>
              {sets.map((outfit, dot) => {
                const t = sets.length === 1 ? 0.5 : dot / (sets.length - 1);
                const x = 16 + t * 288;
                const y = 62 - Math.sin(t * Math.PI) * 48;
                const novel = outfit.novelPairs > 0;
                return (
                  <button
                    key={outfit.signature}
                    type="button"
                    className={dot === index && !override ? (novel ? "tick on novel" : "tick on") : novel ? "tick novel" : "tick"}
                    style={{ left: `${(x / 320) * 100}%`, top: y }}
                    aria-label={`Completion ${dot + 1}`}
                    onClick={() => {
                      setIndex(dot);
                      setOverride(null);
                      tick(8);
                    }}
                  />
                );
              })}
              <div className="dial-labels">
                <span>Easy</span>
                <span>Sharp</span>
              </div>
            </div>
            <p className="line" data-testid="orbit-rationale">
              {line}
            </p>
            {studio.showScores && <p className="scores">{formatScores(active.scores)}</p>}
            <SaveButton saved={saved} onClick={save} />
          </>
        )}
      </div>
      <WeatherMark />
      <TabStandIn />
      <HomeBar />
      {rail && (
        <Rail
          title="Fits the anchor"
          items={rail.items}
          onClose={() => setRail(null)}
          onPick={(item) => {
            const next = replaceSlot(active, rail.slot, item, ctx, studio.history);
            if (!next) return;
            undo.current.push(active);
            setOverride(next);
            setSaved(false);
            setRail(null);
            const look = toLook(next, ctx);
            studio.log("orbit", "swap", { id: item.id, line: look.line });
            tick();
          }}
        />
      )}
      {toast && <Toast title={toast} />}
    </div>
  );
}

function WardrobePick({ onPick, onClose }: { onPick: (item: Item) => void; onClose: () => void }) {
  const items = WARDROBE.filter((item) => item.slot === "top" || item.slot === "onePiece" || item.slot === "outer");
  return (
    <div className="picker">
      <div className="kicker-row">
        <p className="kicker">Choose from the wardrobe</p>
        <button type="button" className="textish" onClick={onClose}>
          Back
        </button>
      </div>
      <div className="grid">
        {items.map((item) => (
          <button key={item.id} type="button" className="grid-card" onClick={() => onPick(item)}>
            <span className="well">
              <Garment item={item} />
            </span>
            <span className="slot-name">{item.short}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function backHref(): string {
  const params = new URLSearchParams(window.location.search);
  params.delete("baseline");
  const text = params.toString();
  return text ? `/?${text}` : "/";
}
