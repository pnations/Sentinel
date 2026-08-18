import type { PersistedIncident } from "../lib/domain";

type IncidentsPanelProps = {
  incidents: PersistedIncident[];
  onOpenIncident: (incidentId: string) => void;
};

export function IncidentsPanel({ incidents, onOpenIncident }: IncidentsPanelProps) {
  const prioritizedIncidents = [...incidents].sort((first, second) => second.riskScore - first.riskScore);
  const pendingCount = prioritizedIncidents.filter((incident) => incident.approvalState === "pending").length;

  return (
    <section className="panel incident-panel" aria-label="Incident queue">
      <div className="panel-heading incident-heading">
        <div>
          <p className="eyebrow">Priority queue</p>
          <h2>Incidents</h2>
        </div>
        <p className="queue-summary">
          {prioritizedIncidents.length} open · {pendingCount} awaiting review
        </p>
      </div>

      <ul className="incident-list">
        {prioritizedIncidents.length === 0 ? (
          <li className="empty">No incidents yet.</li>
        ) : (
          prioritizedIncidents.map((incident, index) => (
            <li key={incident.id}>
              <span className="queue-position" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="incident-summary">
                <div className="event-meta">
                  <span className={`event-severity ${incident.severity}`}>{incident.severity}</span>
                  <span className={`approval-pill ${incident.approvalState}`}>{incident.approvalState}</span>
                </div>
                <p className="incident-title">{incident.title}</p>
                <p className="meta">
                  {incident.status} · confidence {Math.round(incident.confidence * 100)}%
                </p>
              </div>
              <div className="incident-risk">
                <span>risk</span>
                <strong>{incident.riskScore}</strong>
              </div>
              <button type="button" className="review-button" onClick={() => onOpenIncident(incident.id)}>
                Review
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
