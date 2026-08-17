import type { Handler } from "@netlify/functions";
import OpenAI from "openai";

type AnalysisRequest = {
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

const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    severityAssessment: { type: "string", enum: ["critical", "high", "medium", "low", "info"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    likelyExplanation: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    affectedAssets: { type: "array", items: { type: "string" } },
    recommendedActions: { type: "array", items: { type: "string" } },
    questionsForOperator: { type: "array", items: { type: "string" } }
  },
  required: [
    "summary",
    "severityAssessment",
    "confidence",
    "likelyExplanation",
    "evidence",
    "affectedAssets",
    "recommendedActions",
    "questionsForOperator"
  ]
} as const;

const SYSTEM_INSTRUCTIONS = `You are the AI investigation assistant for SentinelH20, an OT security monitoring platform for a fictional water utility.
Deterministic detections and risk scoring are authoritative. Your analysis is advisory only and must never trigger automated response actions.
This environment is simulation-only. Never suggest real-world network scanning, exploitation, or commands to industrial equipment.
Respond with concise operator-facing analysis that strictly matches the provided JSON schema.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown, maxLength = 2_000): value is string {
  return typeof value === "string" && value.length <= maxLength;
}

function isTextArray(value: unknown, maxItems = 20): value is string[] {
  return Array.isArray(value) && value.length <= maxItems && value.every((item) => isText(item, 1_000));
}

function isAnalysisRequest(value: unknown): value is AnalysisRequest {
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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: { Allow: "POST" }, body: JSON.stringify({ message: "Method not allowed." }) };
  }

  if (!process.env.OPENAI_API_KEY) {
    return { statusCode: 503, body: JSON.stringify({ message: "AI investigation is not configured." }) };
  }

  let requestBody: unknown;
  try {
    requestBody = JSON.parse(event.body ?? "");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid request body." }) };
  }

  if (!isAnalysisRequest(requestBody)) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid investigation context." }) };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      instructions: SYSTEM_INSTRUCTIONS,
      input: buildPrompt(requestBody),
      text: {
        format: {
          type: "json_schema",
          name: "incident_analysis",
          schema: ANALYSIS_SCHEMA,
          strict: true
        }
      }
    });
    const analysis = JSON.parse(response.output_text) as Record<string, unknown>;

    return { statusCode: 200, body: JSON.stringify({ model: response.model, ...analysis }) };
  } catch {
    return { statusCode: 502, body: JSON.stringify({ message: "AI investigation could not be completed." }) };
  }
};