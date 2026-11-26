import { useDrag } from "@use-gesture/react";
import { useEffect, useRef, useState } from "react";
import { Garment } from "../components/Garment";
import { Dots, HeartButton, HomeBar, StatusBar, TabStandIn, Toast, WeatherMark } from "../components/Chrome";
import { Rail } from "../components/Rail";
import { alternatives, contextEyebrow, generateEdition, replaceSlot, toLook, variantOutfit } from "../engine/generate";
import { formatScores } from "../engine/score";
import type { Item, Look, Slot } from "../engine/types";
import { useFrozenHistory, useStudio } from "../studio";
import { stopped, tick } from "../ui";

export function DailyEdition() {
  const studio = useStudio();
  const frozen = useFrozenHistory();
  const key = `${studio.ready}|${studio.epoch}|${studio.seed}`;
  const [pack, setPack] = useState<{ key: string; looks: Look[] }>({ key: "", looks: [] });
  if (studio.ready && pack.key !== key) {
    setPack({ key, looks: generateEdition(frozen, studio.context(), studio.seed) });
  }
  const looks = pack.looks;
  const [page, setPage] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [width, setWidth] = useState(360);
  const [rail, setRail] = useState<{ slot: Slot; items: Item[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [scratch, setScratch] = useState<Partial<Record<Slot, Item>> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const undo = useRef<Look[][]>([]);
  const lastTap = useRef(0);
  const tapTimer = useRef<number | null>(null);
  const pages = looks.length + 1;
  const seenKey = useRef(key);
  if (seenKey.current !== key) {
    seenKey.current = key;
    setPage(0);
  }

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setWidth(node.clientWidth || 360);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!studio.ready) return;
    const look = looks[page];
    if (!look) return;
    studio.markShown(look.outfit.ids);
    studio.log("edition", "view", { page, signature: look.outfit.signature });
    // The log and history writes are intentional once per visible look.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, looks, studio.ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setLooks = (next: Look[]) => setPack({ key, looks: next });

  const applyVariant = (direction: 1 | -1) => {
    const look = looks[page];
    if (!look) return;
    const next = variantOutfit(look.outfit, direction, studio.context(), studio.history, studio.seed);
    if (!next) return;
    undo.current.push(looks);
    const copy = looks.slice();
    copy[page] = toLook(next, studio.context());
    setLooks(copy);
    tick();
    studio.log("edition", "formality", { direction });
  };

  const saveCurrent = () => {
    const look = looks[page];
    if (!look || scratch) return;
    studio.saveLook(look.outfit.ids);
    setSaved((current) => ({ ...current, [look.outfit.signature]: true }));
    setToast(look.outfit.novelPairs > 0 ? "Added to your repertoire." : "Saved to Everyday.");
    studio.log("edition", "save", { signature: look.outfit.signature, novel: look.outfit.novelPairs });
    tick(20);
  };

  const undoLast = () => {
    const prev = undo.current.pop();
    if (!prev) return;
    setLooks(prev);
    studio.log("edition", "undo", {});
  };

  const openRail = (slot: Slot, given: Item[]) => {
    const items = alternatives(slot, given, studio.context(), studio.history, studio.seed, 8);
    setRail({ slot, items });
    studio.log("edition", "rail", { slot });
  };

  const bind = useDrag(
    ({ first, last, movement: [mx, my], velocity: [vx], direction: [dx], memo, event }) => {
      if (scratch || stopped(event.target)) return memo;
      if (first) memo = { axis: null as null | "x" | "y" };
      const state = (memo ?? { axis: null }) as { axis: null | "x" | "y" };
      if (!state.axis && (Math.abs(mx) > 10 || Math.abs(my) > 10)) {
        state.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      }
      if (!state.axis) {
        if (last) {
          const slotEl = (event.target as HTMLElement).closest("[data-slot]");
          const slot = slotEl?.getAttribute("data-slot") as Slot | null;
          const now = Date.now();
          if (now - lastTap.current < 280) {
            if (tapTimer.current) window.clearTimeout(tapTimer.current);
            saveCurrent();
          } else if (slot && page < looks.length) {
            tapTimer.current = window.setTimeout(() => {
              const current = looks[page];
              if (current) openRail(slot, itemsOf(current));
            }, 260);
          }
          lastTap.current = now;
        }
        return state;
      }
      if (state.axis === "x") {
        setDragX(mx);
        if (last) {
          const forward = mx < -48 || (mx < -18 && vx > 0.4 && dx < 0);
          const back = mx > 48 || (mx > 18 && vx > 0.4 && dx > 0);
          setPage((current) => {
            if (forward) return Math.min(pages - 1, current + 1);
            if (back) return Math.max(0, current - 1);
            return current;
          });
          setDragX(0);
          if (forward || back) studio.log("edition", "page", { forward });
        }
      } else if (page < looks.length) {
        setDragY(my);
        if (last) {
          const threshold = (stageRef.current?.clientHeight ?? 520) * 0.3;
          if (my < -threshold) applyVariant(1);
          else if (my > threshold) applyVariant(-1);
          setDragY(0);
        }
      }
      return state;
    },
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight") setPage((current) => Math.min(pages - 1, current + 1));
      if (event.key === "ArrowLeft") setPage((current) => Math.max(0, current - 1));
      if (event.key === "ArrowUp") applyVariant(1);
      if (event.key === "ArrowDown") applyVariant(-1);
      if (event.key === "s" || event.key === "S") saveCurrent();
      if (event.key === "z" || event.key === "Z") undoLast();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const look = looks[page];
  const eyebrow = page >= looks.length ? "THAT'S THE EDITION" : look?.eyebrow || "Today's edition";

  return (
    <div className="screen">
      <StatusBar backTo={backHref()} />
      <div className="edition-top">
        <p className="eyebrow">{contextEyebrow(studio.context())}</p>
        <div className="kicker-row">
          <p className={eyebrow === "NEW PAIRING" ? "kicker olive" : "kicker"}>{eyebrow}</p>
          <Dots count={pages} index={page} />
        </div>
      </div>
      {scratch ? (
        <Scratch
          slots={scratch}
          onOpen={(slot) => openRail(slot, Object.values(scratch).filter((item): item is Item => Boolean(item)))}
          onClose={() => setScratch(null)}
          onSave={() => {
            const ids = Object.values(scratch)
              .filter((item): item is Item => Boolean(item))
              .map((item) => item.id);
            if (ids.length >= 3) {
              studio.saveLook(ids);
              setToast("Saved to Everyday.");
              setScratch(null);
            }
          }}
        />
      ) : (
        <div className="gesture" ref={stageRef} data-testid="edition-stage" {...bind()}>
          <div
            className="pager"
            style={{
              width: width * pages,
              transform: `translate3d(${-page * width + dragX}px, ${dragY * 0.12}px, 0)`,
              transition: dragX || dragY ? "none" : "transform 0.34s cubic-bezier(0.22, 1.4, 0.36, 1)",
            }}
          >
            {looks.map((entry, index) => (
              <article key={entry.outfit.signature + entry.headline} className="page" style={{ width }}>
                <div className="stack">
                  {itemsOf(entry).map((item) => (
                    <div key={item.id} className="slot" data-slot={item.slot}>
                      <span className="well">
                        <Garment item={item} />
                      </span>
                      <span className="slot-name">{item.short}</span>
                    </div>
                  ))}
                </div>
                <h2 data-testid={index === page ? "edition-headline" : undefined}>{entry.headline}</h2>
                <p className="line" data-testid={index === page ? "edition-line" : undefined}>
                  {entry.line}
                </p>
                {studio.showScores && <p className="scores">{formatScores(entry.outfit.scores)}</p>}
                <div className="hint-row">
                  <span className="hint">Drag up for dressier</span>
                  <HeartButton saved={Boolean(saved[entry.outfit.signature])} onClick={saveCurrent} />
                </div>
              </article>
            ))}
            <article className="page end-page" style={{ width }}>
              <p className="eyebrow">DONE</p>
              <h2>That's today's edition</h2>
              <p className="line">Four ideas. Pick one, or start from an empty rail.</p>
              <button type="button" className="secondary" data-gesture-stop data-testid="from-scratch" onClick={() => setScratch({})}>
                Build from scratch
              </button>
            </article>
          </div>
          {Math.abs(dragY) > 24 && page < looks.length && (
            <div className="formality-pill">{dragY < 0 ? "Dressier" : "Easier"}</div>
          )}
        </div>
      )}
      <WeatherMark />
      <TabStandIn />
      <HomeBar />
      {rail && (
        <Rail
          title="Fits the rest"
          items={rail.items}
          onClose={() => setRail(null)}
          onPick={(item) => {
            if (scratch) {
              setScratch({ ...scratch, [item.slot]: item });
              if (item.slot === "onePiece") {
                const next = { ...scratch, [item.slot]: item };
                delete next.top;
                delete next.bottom;
                setScratch(next);
              }
              setRail(null);
              return;
            }
            const current = looks[page];
            if (!current) return;
            const next = replaceSlot(current.outfit, rail.slot, item, studio.context(), studio.history);
            if (!next) return;
            undo.current.push(looks);
            const copy = looks.slice();
            copy[page] = toLook(next, studio.context());
            setLooks(copy);
            setRail(null);
            tick();
            studio.log("edition", "swap", { slot: item.slot, id: item.id });
          }}
        />
      )}
      {toast && <Toast title={toast} />}
    </div>
  );
}

function itemsOf(look: Look): Item[] {
  return (["outer", "onePiece", "top", "bottom", "shoes"] as Slot[])
    .map((slot) => look.outfit.bySlot[slot])
    .filter((item): item is Item => Boolean(item));
}

function Scratch({
  slots,
  onOpen,
  onClose,
  onSave,
}: {
  slots: Partial<Record<Slot, Item>>;
  onOpen: (slot: Slot) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const order: Slot[] = slots.onePiece ? ["outer", "onePiece", "shoes"] : ["outer", "top", "bottom", "shoes"];
  return (
    <div className="scratch">
      <h2>From scratch</h2>
      <div className="stack">
        {order.map((slot) => {
          const item = slots[slot];
          return (
            <button key={slot} type="button" className="slot" data-gesture-stop onClick={() => onOpen(slot)}>
              <span className="well">{item ? <Garment item={item} /> : <span className="empty-slot">Add {slot === "onePiece" ? "piece" : slot}</span>}</span>
              <span className="slot-name">{item ? item.short : "Choose"}</span>
            </button>
          );
        })}
      </div>
      <div className="scratch-actions">
        <button type="button" className="secondary" onClick={onClose}>
          Back
        </button>
        <button type="button" className="save" onClick={onSave}>
          Save
        </button>
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
