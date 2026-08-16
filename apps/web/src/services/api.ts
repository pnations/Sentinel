export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type StreamEnvelope = {
  id: string;
  type: string;
  timestamp: string;
  payload: {
    id: string;
    scenarioId?: string;
    simulated: boolean;
    eventType: string;
    severity: Severity;
    description: string;
    timestamp: string;
  };
};

export type PersistedDetection = {
  id: string;
  type: string;
  severity: Severity;
  assetId: string;
  confidence: number;
  evidence: string[];
  eventIds: string[];
  incidentId: string | null;
  createdAt: string;
};

export type PersistedIncident = {
  id: string;
  title: string;
  severity: Severity;
  status: string;
  confidence: number;
  riskScore: number;
  riskExplanation: Record<string, unknown>;
  approvalState: string;
  createdAt: string;
  updatedAt: string;
};

export type FindingEnvelope = {
  id: string;
  type: "finding.created";
  timestamp: string;
  payload: PersistedDetection;
};

export type IncidentEnvelope = {
  id: string;
  type: "incident.created" | "incident.updated";
  timestamp: string;
  payload: PersistedIncident;
};

export type PersistedAiAnalysis = {
  id: string;
  incidentId: string;
  model: string;
  summary: string;
  severityAssessment: Severity;
  confidence: number;
  likelyExplanation: string;
  evidence: string[];
  affectedAssets: string[];
  recommendedActions: string[];
  questionsForOperator: string[];
  createdAt: string;
};

export type AiAnalysisEnvelope = {
  id: string;
  type: "ai.analysis.created";
  timestamp: string;
  payload: PersistedAiAnalysis;
};

export type PersistedResponseAction = {
  id: string;
  incidentId: string;
  actionType: string;
  reason: string;
  approvalState: string;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  executionResult: Record<string, unknown>;
  createdAt: string;
};

export type ResponseActionEnvelope = {
  id: string;
  type: "response.action.updated";
  timestamp: string;
  payload: PersistedResponseAction;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed: ${response.status} ${path}`);
  }

  return response.json();
}

export function getHealth(): Promise<{ service: string; status: string; timestamp: string }> {
  return request("/api/health");
}

export function analyzeIncident(incidentId: string): Promise<PersistedAiAnalysis> {
  return request(`/api/incidents/${incidentId}/analyze`, { method: "POST" });
}

export function runScenario(scenarioId: string): Promise<{ runId: string; stepCount: number }> {
  return request(`/api/simulation/scenarios/${scenarioId}/run`, { method: "POST" });
}

export function getResponseActions(incidentId: string): Promise<PersistedResponseAction[]> {
  return request<{ items: PersistedResponseAction[] }>(`/api/incidents/${incidentId}/response-actions`).then(
    (body) => body.items
  );
}

export function decideResponseAction(
  actionId: string,
  decision: "approved" | "rejected",
  approvedBy: string
): Promise<PersistedResponseAction> {
  return request(`/api/response-actions/${actionId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, approvedBy })
  });
}

export function openStream(handlers: {
  onEvent: (event: StreamEnvelope) => void;
  onFinding: (finding: FindingEnvelope) => void;
  onIncident: (incident: IncidentEnvelope) => void;
  onAnalysis: (analysis: AiAnalysisEnvelope) => void;
  onResponseAction: (action: ResponseActionEnvelope) => void;
  onStatus: (connected: boolean) => void;
}): EventSource {
  const source = new EventSource(`${API_URL}/api/stream`);

  source.onopen = () => handlers.onStatus(true);
  source.onerror = () => handlers.onStatus(false);

  source.addEventListener("event.created", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onEvent(JSON.parse(typed.data) as StreamEnvelope);
  });

  source.addEventListener("finding.created", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onFinding(JSON.parse(typed.data) as FindingEnvelope);
  });

  source.addEventListener("incident.created", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onIncident(JSON.parse(typed.data) as IncidentEnvelope);
  });

  source.addEventListener("incident.updated", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onIncident(JSON.parse(typed.data) as IncidentEnvelope);
  });

  source.addEventListener("ai.analysis.created", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onAnalysis(JSON.parse(typed.data) as AiAnalysisEnvelope);
  });

  source.addEventListener("response.action.updated", (raw) => {
    const typed = raw as MessageEvent<string>;
    handlers.onResponseAction(JSON.parse(typed.data) as ResponseActionEnvelope);
  });

  return source;
}
