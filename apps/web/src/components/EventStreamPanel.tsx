import { formatTime } from "../lib/format";
import type { PersistedEvent } from "../lib/domain";

type EventActivity = {
  eventType: string;
  severity: PersistedEvent["severity"];
  count: number;
  timestamp: string;
  description: string;
  sourceAssetId: string | null;
  destinationAssetId: string | null;
};

function summarizeEvents(events: PersistedEvent[]): EventActivity[] {
  const grouped = new Map<string, EventActivity>();

  for (const event of events) {
    const existing = grouped.get(event.eventType);

    if (existing) {
      existing.count += 1;
      continue;
    }

    grouped.set(event.eventType, {
      eventType: event.eventType,
      severity: event.severity,
      count: 1,
      timestamp: event.timestamp,
      description: event.description,
      sourceAssetId: event.sourceAssetId,
      destinationAssetId: event.destinationAssetId
    });
  }

  return [...grouped.values()];
}

export function EventStreamPanel({ events }: { events: PersistedEvent[] }) {
  const activity = summarizeEvents(events);

  return (
    <section className="panel activity-panel" aria-label="Recent event activity">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Context</p>
          <h2>Recent Activity</h2>
        </div>
        <span className="panel-count" aria-label={`${events.length} total events`}>
          {events.length}
        </span>
      </div>

      <ul className="activity-list">
        {activity.length === 0 ? (
          <li className="empty">No events yet. Simulate an attack to begin the demo.</li>
        ) : (
          activity.map((event) => (
            <li key={event.eventType}>
              <div className="activity-summary">
                <span className={`event-severity ${event.severity}`}>{event.severity}</span>
                <div>
                  <p className="activity-title">{event.eventType.replace(/_/g, " ")}</p>
                  <p className="meta">
                    {event.count} observed · last at {formatTime(event.timestamp)}
                  </p>
                </div>
              </div>
              <p className="activity-description">{event.description}</p>
              {event.sourceAssetId || event.destinationAssetId ? (
                <p className="activity-route">
                  {event.sourceAssetId ?? "external"} <span aria-hidden="true">→</span>{" "}
                  {event.destinationAssetId ?? "unknown"}
                </p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
