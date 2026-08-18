import OpenAI from "openai";

export type AnalysisRequest = {
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    confidence: number;
    riskScore: number;
  };
  detections: Array<{
    type: string;
    severity: string;
    assetId: string;
    confidence: number;
    evidence: string[];
  }>;
  events: Array<{
    timestamp: string;
    eventType: string;
    severity: string;
    description: string;
    sourceAssetId: string | null;
    destinationAssetId: string | null;
    user: string | null;
  }>;
};

export type AnalysisResponse = {
  model: string;
  summary: string;
  severityAssessment: "critical" | "high" | "medium" | "low" | "info";
  confidence: number;
  likelyExplanation: string;
  evidence: string[];
  affectedAssets: string[];
  recommendedActions: string[];
  questionsForOperator: string[];
};

export class InvestigationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message);
  }
}

const SYSTEM_INSTRUCTIONS = `You are the AI investigation assistant for SentinelH20, an OT security monitoring platform for a fictional water utility.
Deterministic detections and risk scoring are authoritative. Your analysis is advisory only and must never trigger automated response actions.
This environment is simulation-only. Never suggest real-world network scanning, exploitation, or commands to industrial equipment.
Respond with a JSON object only. It must include summary, severityAssessment, confidence, likelyExplanation, evidence, affectedAssets, recommendedActions, and questionsForOperator. severityAssessment must be one of critical, high, medium, low, or info. confidence must be a number from 0 through 1. All remaining fields except confidence are strings or arrays of strings.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength = 2_000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isTextArray(value: unknown, maxItems = 20): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isText(item, 1_000));
}

export function isAnalysisRequest(value: unknown): value is AnalysisRequest {
  if (!isRecord(value) || !isRecord(value.incident) || !Array.isArray(value.detections) || !Array.isArray(value.events)) {
    return false;
  }

  const incident = value.incident;
  const validIncident =
    isText(incident.id, 100) &&
    isText(incident.title) &&
    isText(incident.severity, 20) &&
    isText(incident.status, 20) &&
    typeof incident.confidence === "number" &&
    typeof incident.riskScore === "number";
  const validDetections =
    value.detections.length <= 20 &&
    value.detections.every(
      (detection) =>
        isRecord(detection) &&
        isText(detection.type, 100) &&
        isText(detection.severity, 20) &&
        isText(detection.assetId, 100) &&
        typeof detection.confidence === "number" &&
        isTextArray(detection.evidence)
    );
  const validEvents =
    value.events.length <= 50 &&
    value.events.every(
      (event) =>
        isRecord(event) &&
        isText(event.timestamp, 100) &&
        isText(event.eventType, 100) &&
        isText(event.severity, 20) &&
        isText(event.description) &&
        (event.sourceAssetId === null || isText(event.sourceAssetId, 100)) &&
        (event.destinationAssetId === null || isText(event.destinationAssetId, 100)) &&
        (event.user === null || isText(event.user, 100))
    );

  return validIncident && validDetections && validEvents;
}

function isProviderAnalysis(value: unknown): value is Omit<AnalysisResponse, "model"> {
  if (!isRecord(value)) return false;

  return (
    isText(value.summary) &&
    ["critical", "high", "medium", "low", "info"].includes(value.severityAssessment as string) &&
    typeof value.confidence === "number" &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    isText(value.likelyExplanation) &&
    isTextArray(value.evidence) &&
    isTextArray(value.affectedAssets) &&
    isTextArray(value.recommendedActions) &&
    isTextArray(value.questionsForOperator)
  );
}

function buildPrompt({ incident, detections, events }: AnalysisRequest): string {
  const detectionLines = detections
    .map(
      (detection) =>
        `- [${detection.severity}] ${detection.type} on ${detection.assetId} (confidence ${detection.confidence}): ${detection.evidence.join("; ")}`
    )
    .join("\n");
  const eventLines = events
    .map(
      (event) =>
        `- ${event.timestamp} [${event.severity}] ${event.eventType}: ${event.description} (source: ${event.sourceAssetId ?? "unknown"}, destination: ${event.destinationAssetId ?? "unknown"}${event.user ? `, user: ${event.user}` : ""})`
    )
    .join("\n");

  return `Incident: ${incident.title}
Current severity: ${incident.severity}
Status: ${incident.status}
Confidence: ${incident.confidence}
Risk score: ${incident.riskScore}

Detections:
${detectionLines || "(none recorded)"}

Event timeline:
${eventLines || "(none recorded)"}`;
}

export async function investigate(
  requestBody: unknown,
  environment: Record<string, string | undefined>
): Promise<AnalysisResponse> {
  if (!isAnalysisRequest(requestBody)) {
    throw new InvestigationError("Invalid investigation context.", 400);
  }

  if (!environment.GROQ_API_KEY) {
    throw new InvestigationError("AI investigation is not configured.", 503);
  }

  try {
    const client = new OpenAI({
      apiKey: environment.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1"
    });
    const response = await client.chat.completions.create({
      model: environment.GROQ_MODEL ?? "openai/gpt-oss-120b",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTIONS },
        { role: "user", content: buildPrompt(requestBody) }
      ]
    });
    const output = response.choices[0]?.message.content;
    if (!output) {
      throw new Error("AI provider returned no analysis.");
    }
    const analysis = JSON.parse(output) as unknown;
    if (!isProviderAnalysis(analysis)) {
      throw new Error("AI provider returned an invalid analysis.");
    }

    return { model: response.model, ...analysis };
  } catch {
    throw new InvestigationError("AI investigation could not be completed.", 502);
  }
}