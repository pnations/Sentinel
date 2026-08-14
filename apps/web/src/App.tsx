import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { scenarios } from "./lib/scenarios";
import {
  getHealth,
  getRecentDetections,
  getRecentIncidents,
  openStream,
  runScenario,
  type PersistedDetection,
  type PersistedIncident,
  type StreamEnvelope
} from "./services/api";

function App() {
  const [events, setEvents] = useState<StreamEnvelope[]>([]);
  const [detections, setDetections] = useState<PersistedDetection[]>([]);
  const [incidents, setIncidents] = useState<PersistedIncident[]>([]);
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

    getRecentDetections().then(setDetections).catch(() => undefined);
    getRecentIncidents().then(setIncidents).catch(() => undefined);

    const source = openStream({
      onEvent: (message) => {
        setEvents((previous) => [message, ...previous].slice(0, 30));
      },
      onFinding: (finding) => {
        setDetections((previous) => [finding.payload, ...previous].slice(0, 20));
      },
      onIncident: (incident) => {
        setIncidents((previous) => {
          const others = previous.filter((item) => item.id !== incident.payload.id);
          return [incident.payload, ...others].slice(0, 20);
        });
      },
      onStatus: (isConnected) => setConnected(isConnected)
    });

    return () => {
      source.close();
    };
  }, []);

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
    <main className="app-shell">
      <header className="hero">
        <p className="tag">SentinelH20</p>
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

        <article className="panel">
          <h2>Open Incidents</h2>
          <p className="state neutral">
            {incidents.filter((incident) => incident.status !== "resolved").length}
          </p>
          <p className="meta">Correlated from deterministic detections</p>
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
                <div className="event-meta">
                  <span className="event-time">
                    {new Date(event.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </span>
                  <span className={`event-severity ${event.payload.severity}`}>
                    {event.payload.severity}
                  </span>
                  <span className="event-type">{event.payload.eventType}</span>
                </div>
                <p className="event-description">{event.payload.description}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel" aria-label="Detections">
        <h2>Detections</h2>

        <ul className="event-list">
          {detections.length === 0 ? (
            <li className="empty">No detections yet.</li>
          ) : (
            detections.map((detection) => (
              <li key={detection.id}>
                <div className="event-meta">
                  <span className="event-time">
                    {new Date(detection.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </span>
                  <span className={`event-severity ${detection.severity}`}>{detection.severity}</span>
                  <span className="event-type">{detection.type.replace(/_/g, " ")}</span>
                </div>
                <p className="event-description">
                  {detection.assetId} · confidence {Math.round(detection.confidence * 100)}%
                </p>
                {detection.evidence.map((line) => (
                  <p key={line} className="event-description">
                    {line}
                  </p>
                ))}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel" aria-label="Incidents">
        <h2>Incidents</h2>

        <ul className="event-list">
          {incidents.length === 0 ? (
            <li className="empty">No incidents yet.</li>
          ) : (
            incidents.map((incident) => (
              <li key={incident.id}>
                <div className="event-meta">
                  <span className={`event-severity ${incident.severity}`}>{incident.severity}</span>
                  <span className="event-type">{incident.status}</span>
                  <span className="event-type">risk {incident.riskScore}</span>
                </div>
                <p className="event-description">{incident.title}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

export default App;
