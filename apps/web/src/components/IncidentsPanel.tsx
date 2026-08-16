import type { PersistedIncident } from "../services/api";

type IncidentsPanelProps = {
  incidents: PersistedIncident[];
  onOpenIncident: (incidentId: string) => void;
};

export function IncidentsPanel({ incidents, onOpenIncident }: IncidentsPanelProps) {
  return (
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
                <span className={`approval-pill ${incident.approvalState}`}>{incident.approvalState}</span>
              </div>
              <p className="event-description">{incident.title}</p>

              <button type="button" onClick={() => onOpenIncident(incident.id)}>
                Review
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
