import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import { pool } from "../../db/client.js";
import { env } from "../../config/env.js";
import { markIncidentInvestigating, type PersistedIncident } from "../detections/detectionService.js";
import type { SseBroker } from "../streaming/sseBroker.js";

export type PersistedAiAnalysis = {
  id: string;
  incidentId: string;
  model: string;
  summary: string;
  severityAssessment: string;
  confidence: number;
  likelyExplanation: string;
  evidence: string[];
  affectedAssets: string[];
  recommendedActions: string[];
  questionsForOperator: string[];
  createdAt: string;
};

type AnalysisSchema = {
  summary: string;
  severityAssessment: "critical" | "high" | "medium" | "low";
  confidence: number;
  likelyExplanation: string;
  evidence: string[];
  affectedAssets: string[];
  recommendedActions: string[];
  questionsForOperator: string[];
};

const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    severityAssessment: { type: "string", enum: ["critical", "high", "medium", "low"] },
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

// Advisory framing mirrors the deterministic-authoritative / AI-advisory boundary in docs/ARCHITECTURE.md.
const SYSTEM_INSTRUCTIONS = `You are the AI investigation assistant for SentinelH20, an OT security monitoring platform for a fictional water utility (North River).
Deterministic detections and risk scoring are authoritative; your analysis is advisory only and never triggers automated response actions.
This environment is simulation-only: never suggest real-world network scanning, exploitation, or direct commands to industrial equipment.
Given the incident, its detections, and its event timeline, respond with a concise, operator-facing investigation summary strictly matching the provided JSON schema.`;

type IncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  confidence: number;
  risk_score: number;
};

type DetectionRow = {
  id: string;
  type: string;
  severity: string;
  asset_id: string;
  confidence: number;
  evidence: string[];
  created_at: Date;
};

type EventRow = {
  id: string;
  timestamp: Date;
  event_type: string;
  severity: string;
  description: string;
  source_asset_id: string | null;
  destination_asset_id: string | null;
  user_name: string | null;
};

type AssetRow = {
  id: string;
  name: string;
  zone: string;
  criticality: number;
};

async function getIncident(incidentId: string): Promise<IncidentRow | null> {
  const result = await pool.query<IncidentRow>(
    `SELECT id, title, severity, status, confidence, risk_score FROM incidents WHERE id = $1`,
    [incidentId]
  );

  return result.rows[0] ?? null;
}

async function getIncidentDetections(incidentId: string): Promise<DetectionRow[]> {
  const result = await pool.query<DetectionRow>(
    `
      SELECT id, type, severity, asset_id, confidence, evidence, created_at
      FROM detections
      WHERE incident_id = $1
      ORDER BY created_at ASC
    `,
    [incidentId]
  );

  return result.rows;
}

async function getIncidentEvents(incidentId: string): Promise<EventRow[]> {
  const result = await pool.query<EventRow>(
    `
      SELECT e.id, e.timestamp, e.event_type, e.severity, e.description,
             e.source_asset_id, e.destination_asset_id, e.user_name
      FROM incident_events ie
      JOIN events e ON e.id = ie.event_id
      WHERE ie.incident_id = $1
      ORDER BY e.timestamp ASC
    `,
    [incidentId]
  );

  return result.rows;
}

async function getAssetsByIds(assetIds: string[]): Promise<Map<string, AssetRow>> {
  if (assetIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<AssetRow>(
    `SELECT id, name, zone, criticality FROM assets WHERE id = ANY($1::text[])`,
    [assetIds]
  );

  return new Map(result.rows.map((row) => [row.id, row]));
}

function describeAsset(assetId: string | null, assets: Map<string, AssetRow>): string {
  if (!assetId) {
    return "unknown";
  }

  const asset = assets.get(assetId);
  return asset ? `${asset.id} (${asset.name}, zone: ${asset.zone}, criticality: ${asset.criticality})` : assetId;
}

function buildPrompt(
  incident: IncidentRow,
  detections: DetectionRow[],
  events: EventRow[],
  assets: Map<string, AssetRow>
): string {
  const detectionLines = detections
    .map(
      (detection) =>
        `- [${detection.severity}] ${detection.type} on ${describeAsset(detection.asset_id, assets)} ` +
        `(confidence ${detection.confidence}) — ${detection.evidence.join("; ") || "no evidence recorded"}`
    )
    .join("\n");

  const eventLines = events
    .map(
      (event) =>
        `- ${event.timestamp.toISOString()} [${event.severity}] ${event.event_type}: ${event.description} ` +
        `(source: ${describeAsset(event.source_asset_id, assets)}, destination: ${describeAsset(event.destination_asset_id, assets)}` +
        `${event.user_name ? `, user: ${event.user_name}` : ""})`
    )
    .join("\n");

  return `Incident: ${incident.title}
Current severity: ${incident.severity}
Status: ${incident.status}
Confidence: ${incident.confidence}
Risk score: ${incident.risk_score}

Detections:
${detectionLines || "(none recorded)"}

Event timeline:
${eventLines || "(none recorded)"}`;
}

function parseAnalysis(outputText: string): AnalysisSchema {
  const parsed = JSON.parse(outputText) as AnalysisSchema;

  if (typeof parsed.summary !== "string" || typeof parsed.confidence !== "number") {
    throw new Error("AI response did not match the expected analysis schema");
  }

  return parsed;
}

async function persistAnalysis(
  incidentId: string,
  model: string,
  analysis: AnalysisSchema
): Promise<PersistedAiAnalysis> {
  const id = randomUUID();

  const result = await pool.query<{
    id: string;
    incident_id: string;
    model: string;
    summary: string;
    severity_assessment: string;
    confidence: number;
    likely_explanation: string;
    evidence: string[];
    affected_assets: string[];
    recommended_actions: string[];
    questions_for_operator: string[];
    created_at: Date;
  }>(
    `
      INSERT INTO ai_analyses (
        id, incident_id, model, summary, severity_assessment, confidence,
        likely_explanation, evidence, affected_assets, recommended_actions, questions_for_operator
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb)
      RETURNING id, incident_id, model, summary, severity_assessment, confidence,
                likely_explanation, evidence, affected_assets, recommended_actions,
                questions_for_operator, created_at
    `,
    [
      id,
      incidentId,
      model,
      analysis.summary,
      analysis.severityAssessment,
      analysis.confidence,
      analysis.likelyExplanation,
      JSON.stringify(analysis.evidence),
      JSON.stringify(analysis.affectedAssets),
      JSON.stringify(analysis.recommendedActions),
      JSON.stringify(analysis.questionsForOperator)
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("AI analysis insert did not return a row");
  }

  await pool.query(`UPDATE incidents SET ai_summary = $1, updated_at = now() WHERE id = $2`, [
    row.summary,
    incidentId
  ]);

  return {
    id: row.id,
    incidentId: row.incident_id,
    model: row.model,
    summary: row.summary,
    severityAssessment: row.severity_assessment,
    confidence: row.confidence,
    likelyExplanation: row.likely_explanation,
    evidence: row.evidence,
    affectedAssets: row.affected_assets,
    recommendedActions: row.recommended_actions,
    questionsForOperator: row.questions_for_operator,
    createdAt: row.created_at.toISOString()
  };
}

export class InvestigationService {
  private readonly sseBroker: SseBroker;
  private client: OpenAI | null = null;

  constructor(sseBroker: SseBroker) {
    this.sseBroker = sseBroker;
  }

  private getClient(): OpenAI {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!this.client) {
      this.client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    }

    return this.client;
  }

  async analyzeIncident(incidentId: string): Promise<PersistedAiAnalysis> {
    const incident = await getIncident(incidentId);

    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const [detections, events] = await Promise.all([
      getIncidentDetections(incidentId),
      getIncidentEvents(incidentId)
    ]);

    const assetIds = new Set<string>();
    for (const detection of detections) assetIds.add(detection.asset_id);
    for (const event of events) {
      if (event.source_asset_id) assetIds.add(event.source_asset_id);
      if (event.destination_asset_id) assetIds.add(event.destination_asset_id);
    }

    const assets = await getAssetsByIds([...assetIds]);
    const prompt = buildPrompt(incident, detections, events, assets);
    const client = this.getClient();

    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      instructions: SYSTEM_INSTRUCTIONS,
      input: prompt,
      text: {
        format: {
          type: "json_schema",
          name: "incident_analysis",
          schema: ANALYSIS_JSON_SCHEMA,
          strict: true
        }
      }
    });

    const analysis = parseAnalysis(response.output_text);
    const stored = await persistAnalysis(incidentId, response.model, analysis);

    this.sseBroker.publish({
      id: stored.id,
      timestamp: stored.createdAt,
      type: "ai.analysis.created",
      payload: stored
    });

    const updatedIncident = await markIncidentInvestigating(incidentId);
    if (updatedIncident) {
      this.publishIncidentUpdate(updatedIncident);
    }

    return stored;
  }

  async getRecentAnalyses(incidentId: string, limit = 20): Promise<PersistedAiAnalysis[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const result = await pool.query<{
      id: string;
      incident_id: string;
      model: string;
      summary: string;
      severity_assessment: string;
      confidence: number;
      likely_explanation: string;
      evidence: string[];
      affected_assets: string[];
      recommended_actions: string[];
      questions_for_operator: string[];
      created_at: Date;
    }>(
      `
        SELECT id, incident_id, model, summary, severity_assessment, confidence,
               likely_explanation, evidence, affected_assets, recommended_actions,
               questions_for_operator, created_at
        FROM ai_analyses
        WHERE incident_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [incidentId, safeLimit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      incidentId: row.incident_id,
      model: row.model,
      summary: row.summary,
      severityAssessment: row.severity_assessment,
      confidence: row.confidence,
      likelyExplanation: row.likely_explanation,
      evidence: row.evidence,
      affectedAssets: row.affected_assets,
      recommendedActions: row.recommended_actions,
      questionsForOperator: row.questions_for_operator,
      createdAt: row.created_at.toISOString()
    }));
  }

  private publishIncidentUpdate(incident: PersistedIncident): void {
    this.sseBroker.publish({
      id: incident.id,
      timestamp: incident.updatedAt,
      type: "incident.updated",
      payload: incident
    });
  }
}
