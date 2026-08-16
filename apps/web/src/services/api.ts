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

export function openStream(handlers: {
  onEvent: (event: StreamEnvelope) => void;
  onFinding: (finding: FindingEnvelope) => void;
  onIncident: (incident: IncidentEnvelope) => void;
  onAnalysis: (analysis: AiAnalysisEnvelope) => void;
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

  return source;
}
