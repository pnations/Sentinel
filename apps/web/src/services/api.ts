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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function getHealth(): Promise<{ service: string; status: string; timestamp: string }> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }

  return response.json();
}

export async function getRecentDetections(limit = 20): Promise<PersistedDetection[]> {
  const response = await fetch(`${API_URL}/api/detections/recent?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Detections request failed: ${response.status}`);
  }

  const body = (await response.json()) as { items: PersistedDetection[] };
  return body.items;
}

export async function getRecentIncidents(limit = 20): Promise<PersistedIncident[]> {
  const response = await fetch(`${API_URL}/api/incidents/recent?limit=${limit}`);

  if (!response.ok) {
    throw new Error(`Incidents request failed: ${response.status}`);
  }

  const body = (await response.json()) as { items: PersistedIncident[] };
  return body.items;
}

export async function simulateAttack(input: {
  scenarioId: string;
  severity: Severity;
  eventType: string;
  description: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/api/simulation/demo-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Simulation request failed: ${response.status}`);
  }
}

export async function runScenario(scenarioId: string): Promise<{ runId: string; stepCount: number }> {
  const response = await fetch(`${API_URL}/api/simulation/scenarios/${scenarioId}/run`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Scenario run failed: ${response.status}`);
  }

  return response.json();
}

export function openStream(handlers: {
  onEvent: (event: StreamEnvelope) => void;
  onFinding: (finding: FindingEnvelope) => void;
  onIncident: (incident: IncidentEnvelope) => void;
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

  return source;
}
