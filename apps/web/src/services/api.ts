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

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export async function getHealth(): Promise<{ service: string; status: string; timestamp: string }> {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error(`Health request failed: ${response.status}`);
  }

  return response.json();
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

export function openStream(
  onMessage: (event: StreamEnvelope) => void,
  onStatus: (connected: boolean) => void
): EventSource {
  const source = new EventSource(`${API_URL}/api/stream`);

  source.onopen = () => onStatus(true);
  source.onerror = () => onStatus(false);

  source.addEventListener("event.created", (raw) => {
    const typed = raw as MessageEvent<string>;
    onMessage(JSON.parse(typed.data) as StreamEnvelope);
  });

  return source;
}
