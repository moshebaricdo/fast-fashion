import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { generateEdition, makeContext } from "./engine/generate";
import {
  clearPersisted,
  loadPersisted,
  recordShown,
  savePersisted,
  seedHistory,
  type LogEvent,
} from "./engine/history";
import type { Ctx, History, Mode } from "./engine/types";

export type ScenarioId = "thu" | "sat" | "mon" | "wed";

interface StudioValue {
  seed: string;
  scenario: ScenarioId;
  day: number;
  novelty: number;
  reopened: boolean;
  showScores: boolean;
  debug: boolean;
  sessionShift: number;
  history: History;
  epoch: number;
  ready: boolean;
  setDebug: (value: boolean) => void;
  toggleDebug: () => void;
  setScenario: (id: ScenarioId) => void;
  setNovelty: (value: number) => void;
  setReopened: (value: boolean) => void;
  setShowScores: (value: boolean) => void;
  setShift: (value: number) => void;
  nudge: (direction: number) => void;
  markShown: (ids: string[]) => void;
  saveLook: (ids: string[]) => void;
  resetHistory: () => void;
  nextMorning: () => void;
  log: (prototype: string, type: string, detail?: unknown) => void;
  exportLogs: () => void;
  context: (mode?: Mode, shift?: number) => Ctx;
}

const StudioContext = createContext<StudioValue | null>(null);

function isScenario(value: string | undefined): value is ScenarioId {
  return value === "thu" || value === "sat" || value === "mon" || value === "wed";
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [params] = useSearchParams();
  const seed = params.get("seed") || "fastfashion";
  const [scenario, setScenarioState] = useState<ScenarioId>("thu");
  const [day, setDay] = useState(0);
  const [novelty, setNovelty] = useState(0.45);
  const [reopened, setReopened] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [debug, setDebug] = useState(params.get("debug") === "1");
  const [sessionShift, setShift] = useState(0);
  const [history, setHistory] = useState<History>(() => seedHistory());
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [epoch, setEpoch] = useState(0);
  const [ready, setReady] = useState(false);
  const started = useRef(0);
  const hydrated = useRef(false);

  useEffect(() => {
    const stored = loadPersisted();
    if (stored && isScenario(stored.scenario)) {
      setHistory(stored.history);
      setLogs(stored.logs ?? []);
      setScenarioState(stored.scenario);
      setDay(stored.day ?? 0);
      setNovelty(stored.novelty ?? 0.45);
      setReopened(Boolean(stored.reopened));
    }
    started.current = performance.now();
    hydrated.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePersisted({ history, logs, scenario, day, novelty, reopened });
  }, [ready, history, logs, scenario, day, novelty, reopened]);

  const log = useCallback((prototype: string, type: string, detail?: unknown) => {
    setLogs((current) => [...current, { t: Math.round(performance.now() - started.current), prototype, type, detail }]);
  }, []);

  const context = useCallback(
    (mode: Mode = "inferred", shift = sessionShift) => makeContext(scenario, day, novelty, shift, mode),
    [scenario, day, novelty, sessionShift],
  );

  const value = useMemo<StudioValue>(
    () => ({
      seed,
      scenario,
      day,
      novelty,
      reopened,
      showScores,
      debug,
      sessionShift,
      history,
      epoch,
      ready,
      setDebug,
      toggleDebug: () => setDebug((open) => !open),
      setScenario: (id) => {
        setScenarioState(id);
        setDay(0);
        setReopened(false);
        setShift(0);
        setEpoch((n) => n + 1);
      },
      setNovelty: (next) => {
        setNovelty(next);
        setEpoch((n) => n + 1);
      },
      setReopened: (next) => {
        setReopened(next);
        setEpoch((n) => n + 1);
      },
      setShowScores,
      setShift,
      nudge: (direction) => setShift((current) => Math.max(-1.5, Math.min(1.5, current + direction))),
      markShown: (ids) => setHistory((current) => recordShown(current, ids, day)),
      saveLook: (ids) => setHistory((current) => recordShown(current, ids, day, true)),
      resetHistory: () => {
        clearPersisted();
        setHistory(seedHistory());
        setLogs([]);
        setDay(0);
        setShift(0);
        setReopened(false);
        setEpoch((n) => n + 1);
      },
      nextMorning: () => {
        setDay((current) => current + 1);
        setShift(0);
        setReopened(false);
        setEpoch((n) => n + 1);
      },
      log,
      exportLogs: () => {
        const blob = new Blob([JSON.stringify({ seed, scenario, day, logs }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "fastfashion-core-ux-logs.json";
        link.click();
        URL.revokeObjectURL(url);
      },
      context,
    }),
    [seed, scenario, day, novelty, reopened, showScores, debug, sessionShift, history, epoch, ready, log, context],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): StudioValue {
  const value = useContext(StudioContext);
  if (!value) throw new Error("Studio missing");
  return value;
}

/** History snapshot for generation. Viewing and saving update the live log without reshuffling the morning. */
export function useFrozenHistory(): History {
  const studio = useStudio();
  const key = `${studio.ready}|${studio.epoch}|${studio.seed}|${studio.scenario}|${studio.day}|${studio.novelty}|${studio.reopened}`;
  const cache = useRef<{ key: string; history: History } | null>(null);
  if (!cache.current || cache.current.key !== key) {
    let history = studio.history;
    if (studio.reopened) {
      const ctx = makeContext(studio.scenario, studio.day, studio.novelty, 0);
      const morning = generateEdition(history, ctx, `${studio.seed}:am`);
      for (const look of morning) history = recordShown(history, look.outfit.ids, studio.day);
    }
    cache.current = { key, history };
  }
  return cache.current.history;
}
