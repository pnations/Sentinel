import { useState } from "react";
import { scenarios } from "../lib/scenarios";

type ScenarioPanelProps = {
  onRunScenario: (scenarioId: string) => boolean;
  scenarioRunning: boolean;
};

export function ScenarioPanel({ onRunScenario, scenarioRunning }: ScenarioPanelProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [error, setError] = useState("");

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];

  const onSimulateAttack = () => {
    setError("");

    if (!onRunScenario(selectedScenario.id)) {
      setError("A simulation is already running.");
    }
  };

  return (
    <section className="panel scenario-panel" aria-label="Attack simulation controls">
      <h2>Simulate Attack</h2>
      <p className="meta">
        Simulation-only controls. No real network scanning or industrial control actions.
      </p>
      <label htmlFor="scenario-select">Scenario</label>
      <select
        id="scenario-select"
        value={selectedScenarioId}
        onChange={(event) => setSelectedScenarioId(event.target.value)}
        disabled={scenarioRunning}
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.name}
          </option>
        ))}
      </select>

      <p className="scenario-description">{selectedScenario.description}</p>
      {error ? <p className="error">{error}</p> : null}

      <button type="button" onClick={onSimulateAttack} disabled={scenarioRunning}>
        {scenarioRunning ? "Injecting simulated sequence..." : "SIMULATE ATTACK"}
      </button>
    </section>
  );
}
