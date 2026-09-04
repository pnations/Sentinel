import type { PersistedAiAnalysis } from "../lib/domain";

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
      {analysis.citations.length > 0 ? (
        <>
          <p className="meta">Reference material:</p>
          <ul>
            {analysis.citations.map((citation) => (
              <li key={citation.id} className="event-description">
                <a href={citation.url} target="_blank" rel="noreferrer">
                  {citation.organization}: {citation.title}
                </a>{" "}
                <span className="meta">Updated {citation.publishedAt}</span>
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
