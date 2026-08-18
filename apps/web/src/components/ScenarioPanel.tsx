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
      <div className="scenario-control">
        <div><label htmlFor="scenario-select">Run a simulated scenario</label><select id="scenario-select" value={selectedScenarioId} onChange={(event) => setSelectedScenarioId(event.target.value)} disabled={scenarioRunning}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></div>
        <button type="button" onClick={onSimulateAttack} disabled={scenarioRunning}>{scenarioRunning ? "Injecting simulated sequence..." : "Run scenario"}</button>
      </div>
      <p className="scenario-description">{selectedScenario.description}</p>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
