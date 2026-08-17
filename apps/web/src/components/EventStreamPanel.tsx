import { formatTime } from "../lib/format";
import type { PersistedEvent } from "../lib/domain";

export function EventStreamPanel({ events }: { events: PersistedEvent[] }) {
  return (
    <section className="panel" aria-label="Live event stream">
      <h2>Live Event Stream</h2>

      <ul className="event-list">
        {events.length === 0 ? (
          <li className="empty">No events yet. Simulate an attack to begin the demo.</li>
        ) : (
          events.map((event) => (
            <li key={event.id}>
              <div className="event-meta">
                <span className="event-time">{formatTime(event.timestamp)}</span>
                <span className={`event-severity ${event.severity}`}>{event.severity}</span>
                <span className="event-type">{event.eventType}</span>
              </div>
              <p className="event-description">{event.description}</p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
