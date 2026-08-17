type StatusGridProps = {
  demoReady: boolean;
  sessionLabel: string;
  localSimulation: boolean;
  eventCount: number;
  openIncidentCount: number;
};

export function StatusGrid({
  demoReady,
  sessionLabel,
  localSimulation,
  eventCount,
  openIncidentCount
}: StatusGridProps) {
  return (
    <section className="status-grid" aria-label="System status panels">
      <article className="panel">
        <h2>Demo Status</h2>
        <p className={`state ${demoReady ? "ok" : "warn"}`}>
          {demoReady ? "Ready" : "Unavailable"}
        </p>
        <p className="meta">{sessionLabel}</p>
      </article>

      <article className="panel">
        <h2>Simulation Mode</h2>
        <p className={`state ${localSimulation ? "ok" : "warn"}`}>
          {localSimulation ? "Local" : "Unavailable"}
        </p>
        <p className="meta">State resets when this page refreshes</p>
      </article>

      <article className="panel">
        <h2>Recent Events</h2>
        <p className="state neutral">{eventCount}</p>
        <p className="meta">Events currently buffered in UI</p>
      </article>

      <article className="panel">
        <h2>Open Incidents</h2>
        <p className="state neutral">{openIncidentCount}</p>
        <p className="meta">Correlated from deterministic detections</p>
      </article>
    </section>
  );
}
