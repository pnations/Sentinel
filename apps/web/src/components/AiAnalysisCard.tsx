import type { PersistedAiAnalysis } from "../services/api";

// Recommended actions are rendered separately as approvable Response Action cards, not here.
export function AiAnalysisCard({ analysis }: { analysis: PersistedAiAnalysis }) {
  return (
    <div className="ai-analysis">
      <p className="event-description">{analysis.summary}</p>
      <p className="meta">
        AI severity assessment: {analysis.severityAssessment} · confidence{" "}
        {Math.round(analysis.confidence * 100)}%
      </p>
      <p className="event-description">{analysis.likelyExplanation}</p>
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
