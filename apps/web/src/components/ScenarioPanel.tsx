import { useState } from "react";
import { scenarios } from "../lib/scenarios";
import { runScenario } from "../services/api";

export function ScenarioPanel() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0];

  const onSimulateAttack = async () => {
    setLoading(true);
    setError("");

    try {
      await runScenario(selectedScenario.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run scenario");
    } finally {
      setLoading(false);
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
      >
        {scenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.name}
          </option>
        ))}
      </select>

      <p className="scenario-description">{selectedScenario.description}</p>
      {error ? <p className="error">{error}</p> : null}

      <button type="button" onClick={onSimulateAttack} disabled={loading}>
        {loading ? "Injecting simulated sequence..." : "SIMULATE ATTACK"}
      </button>
    </section>
  );
}
