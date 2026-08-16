import { formatTime } from "../lib/format";
import type { PersistedDetection } from "../services/api";

export function DetectionsPanel({ detections }: { detections: PersistedDetection[] }) {
  return (
    <section className="panel" aria-label="Detections">
      <h2>Detections</h2>

      <ul className="event-list">
        {detections.length === 0 ? (
          <li className="empty">No detections yet.</li>
        ) : (
          detections.map((detection) => (
            <li key={detection.id}>
              <div className="event-meta">
                <span className="event-time">{formatTime(detection.createdAt)}</span>
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
  );
}
