type StatusGridProps = {
  healthStatus: string;
  healthTimestamp: string;
  connected: boolean;
  eventCount: number;
  openIncidentCount: number;
};

export function StatusGrid({
  healthStatus,
  healthTimestamp,
  connected,
  eventCount,
  openIncidentCount
}: StatusGridProps) {
  return (
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
