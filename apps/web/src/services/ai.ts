import type { PersistedAiAnalysis, PersistedDetection, PersistedEvent, PersistedIncident } from "../lib/domain";

export type AnalysisRequest = {
  incident: PersistedIncident;
  detections: PersistedDetection[];
  events: PersistedEvent[];
};

export type AnalysisResult = Omit<PersistedAiAnalysis, "id" | "incidentId" | "createdAt">;

export async function analyzeIncident(requestBody: AnalysisRequest): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "AI investigation is unavailable.");
  }

  return response.json() as Promise<AnalysisResult>;
}