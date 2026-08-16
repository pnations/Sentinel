import { useEffect, useRef, useState } from "react";
import { AiAnalysisCard } from "./AiAnalysisCard";
import type { PersistedAiAnalysis, PersistedIncident, PersistedResponseAction } from "../services/api";

type IncidentDetailPanelProps = {
  incident: PersistedIncident;
  analysis: PersistedAiAnalysis | undefined;
  responseActions: PersistedResponseAction[];
  reviewerName: string;
  onSetReviewerName: (name: string) => void;
  onClose: () => void;
  onInvestigate: (incidentId: string) => Promise<void>;
  onDecision: (actionId: string, decision: "approved" | "rejected") => Promise<void>;
};

const FOCUSABLE_SELECTOR = 'button, input, [href], select, textarea, [tabindex]:not([tabindex="-1"])';

export function IncidentDetailPanel({
  incident,
  analysis,
  responseActions,
  reviewerName,
  onSetReviewerName,
  onClose,
  onInvestigate,
  onDecision
}: IncidentDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [investigating, setInvestigating] = useState(false);
  const [investigateError, setInvestigateError] = useState("");
  const [decidingActionId, setDecidingActionId] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState("");
  const [editingName, setEditingName] = useState(reviewerName.length === 0);
  const [nameDraft, setNameDraft] = useState(reviewerName);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Escape closes the drawer; Tab is trapped within it while open (no other modal exists in this app yet).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleInvestigate = async () => {
    setInvestigating(true);
    setInvestigateError("");

    try {
      await onInvestigate(incident.id);
    } catch (err) {
      setInvestigateError(err instanceof Error ? err.message : "Unable to analyze incident");
    } finally {
      setInvestigating(false);
    }
  };

  const handleDecision = async (actionId: string, decision: "approved" | "rejected") => {
    setDecidingActionId(actionId);
    setDecisionError("");

    try {
      await onDecision(actionId, decision);
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : "Unable to record decision");
    } finally {
      setDecidingActionId(null);
    }
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();

    if (trimmed.length === 0) {
      return;
    }

    onSetReviewerName(trimmed);
    setEditingName(false);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Incident detail: ${incident.title}`}
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div className="event-meta">
            <span className={`event-severity ${incident.severity}`}>{incident.severity}</span>
            <span className="event-type">{incident.status}</span>
            <span className={`approval-pill ${incident.approvalState}`}>{incident.approvalState}</span>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} ref={closeButtonRef}>
            Close
          </button>
        </div>

        <h2 className="drawer-title">{incident.title}</h2>
        <p className="meta">
          Risk score {incident.riskScore} · confidence {Math.round(incident.confidence * 100)}%
        </p>

        <div className="reviewer-identity">
          {editingName ? (
            <>
              <label htmlFor="reviewer-name">Reviewing as</label>
              <input
                id="reviewer-name"
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Your name"
              />
              <button type="button" onClick={saveName}>
                Start reviewing
              </button>
            </>
          ) : (
            <p className="meta">
              Reviewing as <strong>{reviewerName}</strong>{" "}
              <button type="button" className="button-link" onClick={() => setEditingName(true)}>
                change
              </button>
            </p>
          )}
        </div>

        <section aria-label="AI investigation">
          <h3>AI Investigation</h3>
          {investigateError ? <p className="error">{investigateError}</p> : null}

          {analysis ? (
            <AiAnalysisCard analysis={analysis} />
          ) : (
            <p className="meta">No AI analysis yet for this incident.</p>
          )}

          <button type="button" onClick={handleInvestigate} disabled={investigating}>
            {investigating ? "Investigating..." : analysis ? "Re-investigate with AI" : "Investigate with AI"}
          </button>
        </section>

        {analysis ? (
          <section aria-label="Response actions">
            <h3>Response Actions</h3>
            {decisionError ? <p className="error">{decisionError}</p> : null}
            {!reviewerName ? <p className="meta">Set your reviewer name above to approve or reject.</p> : null}

            {responseActions.length === 0 ? (
              <p className="empty">No response actions recommended for this incident.</p>
            ) : (
              <ul className="event-list">
                {responseActions.map((action) => (
                  <li key={action.id}>
                    <p className="event-description">{action.reason}</p>

                    {action.approvalState === "pending" ? (
                      <div className="response-action-controls">
                        <button
                          type="button"
                          onClick={() => handleDecision(action.id, "approved")}
                          disabled={decidingActionId === action.id || !reviewerName}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="button-reject"
                          onClick={() => handleDecision(action.id, "rejected")}
                          disabled={decidingActionId === action.id || !reviewerName}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <p className="meta">
                        {action.approvalState === "approved" ? "Approved" : "Rejected"} by {action.approvedBy}
                        {action.approvedAt ? ` · ${new Date(action.approvedAt).toLocaleTimeString()}` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
