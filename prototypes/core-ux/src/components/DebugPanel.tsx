import { useStudio, type ScenarioId } from "../studio";

const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: "thu", label: "Thu workday · 9°→14° · rain after 3" },
  { id: "sat", label: "Sat · 18° · dry" },
  { id: "mon", label: "Mon · 27° · humid" },
  { id: "wed", label: "Wed · 4° · windy" },
];

export function DebugPanel() {
  const studio = useStudio();
  if (!studio.debug) return null;
  return (
    <div className="debug" data-gesture-stop data-testid="debug">
      <div className="debug-card">
        <header>
          <strong>Scenario</strong>
          <button type="button" onClick={() => studio.setDebug(false)} aria-label="Close debug">
            Close
          </button>
        </header>
        <div className="debug-scenarios">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className={studio.scenario === scenario.id ? "on" : ""}
              onClick={() => studio.setScenario(scenario.id)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
        <label className="check-row">
          <input type="checkbox" checked={studio.reopened} onChange={(event) => studio.setReopened(event.target.checked)} />
          Same day, re-opened
        </label>
        <label className="slider-row">
          Novelty
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={studio.novelty}
            onChange={(event) => studio.setNovelty(Number(event.target.value))}
          />
          <span>{studio.novelty < 0.34 ? "Familiar" : studio.novelty > 0.66 ? "Fresh" : "Balanced"}</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={studio.showScores} onChange={(event) => studio.setShowScores(event.target.checked)} />
          Show score breakdown
        </label>
        <div className="debug-actions">
          <button type="button" onClick={studio.nextMorning}>
            Next morning
          </button>
          <button type="button" onClick={studio.resetHistory}>
            Reset history
          </button>
          <button type="button" onClick={studio.exportLogs}>
            Export logs
          </button>
        </div>
        <p className="debug-note">Day {studio.day} · seed {studio.seed}. Keys: arrows, S save, Z undo.</p>
      </div>
    </div>
  );
}
