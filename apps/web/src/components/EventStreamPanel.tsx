import { formatTime } from "../lib/format";
import type { StreamEnvelope } from "../services/api";

export function EventStreamPanel({ events }: { events: StreamEnvelope[] }) {
  return (
    <section className="panel" aria-label="Live event stream">
      <h2>Live Event Stream</h2>

      <ul className="event-list">
        {events.length === 0 ? (
          <li className="empty">No events yet. Start normal operations or simulate an attack.</li>
        ) : (
          events.map((event) => (
            <li key={event.id}>
              <div className="event-meta">
                <span className="event-time">{formatTime(event.timestamp)}</span>
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
  );
}
