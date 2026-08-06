import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { scenarios } from "./lib/scenarios";
import { getHealth, openStream, simulateAttack, type StreamEnvelope } from "./services/api";

function App() {
  const [events, setEvents] = useState<StreamEnvelope[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState("checking");
  const [healthTimestamp, setHealthTimestamp] = useState<string>("");
  const [selectedScenarioId, setSelectedScenarioId] = useState(scenarios[0].id);
  const [error, setError] = useState<string>("");

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[0],
    [selectedScenarioId]
  );

  useEffect(() => {
    getHealth()
      .then((health) => {
        setHealthStatus(health.status);
        setHealthTimestamp(health.timestamp);
      })
      .catch((err: Error) => {
        setHealthStatus("offline");
        setError(err.message);
      });

    const source = openStream(
      (message) => {
        setEvents((previous) => [message, ...previous].slice(0, 30));
      },
      (isConnected) => setConnected(isConnected)
    );

    return () => {
      source.close();
    };
  }, []);

  const onSimulateAttack = async () => {
    setLoading(true);
    setError("");

    try {
      await simulateAttack({
        scenarioId: selectedScenario.id,
        severity: selectedScenario.severity,
        eventType: selectedScenario.eventType,
        description: selectedScenario.description
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to inject simulated event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="tag">SentinelFlow</p>
        <h1>AI-assisted OT security monitoring for North River Water Utility</h1>
        <p className="subtitle">
          Deterministic detection first. AI-assisted investigation second. Human-approved
          response always.
        </p>
      </header>

      <section className="status-grid" aria-label="System status panels">
        <article className="panel">
          <h2>System Status</h2>
          <p className={`state ${healthStatus === "ok" ? "ok" : "warn"}`}>
            {healthStatus === "ok" ? "Operational" : "Degraded"}
          </p>
          <p className="meta">Last API check: {healthTimestamp || "pending"}</p>
        </article>

        <article className="panel">
          <h2>Stream Status</h2>
          <p className={`state ${connected ? "ok" : "warn"}`}>
            {connected ? "Connected" : "Reconnecting"}
          </p>
          <p className="meta">Live updates via server-sent events</p>
        </article>

        <article className="panel">
          <h2>Recent Events</h2>
          <p className="state neutral">{events.length}</p>
          <p className="meta">Events currently buffered in UI</p>
        </article>
      </section>

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

        <button type="button" onClick={onSimulateAttack} disabled={loading}>
          {loading ? "Injecting simulated sequence..." : "SIMULATE ATTACK"}
        </button>
      </section>

      <section className="panel" aria-label="Live event stream">
        <h2>Live Event Stream</h2>
        {error ? <p className="error">{error}</p> : null}

        <ul className="event-list">
          {events.length === 0 ? (
            <li className="empty">No events yet. Start normal operations or simulate an attack.</li>
          ) : (
            events.map((event) => (
              <li key={event.id}>
                <span className="event-time">{new Date(event.timestamp).toLocaleTimeString()}</span>
                <span className={`event-severity ${event.payload.severity}`}>
                  {event.payload.severity}
                </span>
                <span className="event-type">{event.payload.eventType}</span>
                <p>{event.payload.description}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

export default App;
