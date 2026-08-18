import { formatTime } from "../lib/format";
import type { PersistedDetection } from "../lib/domain";

export function DetectionsPanel({ detections }: { detections: PersistedDetection[] }) {
  return (
    <section className="panel detection-panel" aria-label="Detections">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Deterministic rules</p>
          <h2>Findings</h2>
        </div>
        <span className="panel-count" aria-label={`${detections.length} findings`}>
          {detections.length}
        </span>
      </div>

      <ul className="event-list compact-list">
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
