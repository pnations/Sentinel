import { useState } from "react";
import { analyzeIncident, type PersistedAiAnalysis, type PersistedIncident } from "../services/api";

type IncidentsPanelProps = {
  incidents: PersistedIncident[];
  analyses: Record<string, PersistedAiAnalysis>;
  onAnalysisRecorded: (analysis: PersistedAiAnalysis) => void;
};

export function IncidentsPanel({ incidents, analyses, onAnalysisRecorded }: IncidentsPanelProps) {
  const [analyzingIncidentId, setAnalyzingIncidentId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const onInvestigate = async (incidentId: string) => {
    setAnalyzingIncidentId(incidentId);
    setError("");

    try {
      onAnalysisRecorded(await analyzeIncident(incidentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to analyze incident");
    } finally {
      setAnalyzingIncidentId(null);
    }
  };

  return (
    <section className="panel" aria-label="Incidents">
      <h2>Incidents</h2>
      {error ? <p className="error">{error}</p> : null}

      <ul className="event-list">
        {incidents.length === 0 ? (
          <li className="empty">No incidents yet.</li>
        ) : (
          incidents.map((incident) => {
            const analysis = analyses[incident.id];

            return (
              <li key={incident.id}>
                <div className="event-meta">
                  <span className={`event-severity ${incident.severity}`}>{incident.severity}</span>
                  <span className="event-type">{incident.status}</span>
                  <span className="event-type">risk {incident.riskScore}</span>
                </div>
                <p className="event-description">{incident.title}</p>

                <button
                  type="button"
                  onClick={() => onInvestigate(incident.id)}
                  disabled={analyzingIncidentId === incident.id}
                >
                  {analyzingIncidentId === incident.id
                    ? "Investigating..."
                    : analysis
                      ? "Re-investigate with AI"
                      : "Investigate with AI"}
                </button>

                {analysis ? <AiAnalysisCard analysis={analysis} /> : null}
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function AiAnalysisCard({ analysis }: { analysis: PersistedAiAnalysis }) {
  return (
    <div className="ai-analysis">
      <p className="event-description">{analysis.summary}</p>
      <p className="meta">
        AI severity assessment: {analysis.severityAssessment} · confidence{" "}
        {Math.round(analysis.confidence * 100)}%
      </p>
      <p className="event-description">{analysis.likelyExplanation}</p>
      {analysis.recommendedActions.length > 0 ? (
        <>
          <p className="meta">Recommended actions (human approval required):</p>
          <ul>
            {analysis.recommendedActions.map((action) => (
              <li key={action} className="event-description">
                {action}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {analysis.questionsForOperator.length > 0 ? (
        <>
          <p className="meta">Questions for operator:</p>
          <ul>
            {analysis.questionsForOperator.map((question) => (
              <li key={question} className="event-description">
                {question}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
