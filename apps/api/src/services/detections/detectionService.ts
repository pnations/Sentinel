import { randomUUID } from "node:crypto";
import { pool } from "../../db/client.js";
import type { PersistedEvent } from "../events/eventService.js";
import { detectionRules, type DetectionCandidate } from "./detectionRules.js";

export type PersistedDetection = {
  id: string;
  type: string;
  severity: string;
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
  severity: string;
  status: string;
  confidence: number;
  riskScore: number;
  riskExplanation: Record<string, unknown>;
  approvalState: string;
  createdAt: string;
  updatedAt: string;
};

export type DetectionResult = {
  detection: PersistedDetection;
  incident: PersistedIncident;
  incidentIsNew: boolean;
};

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 30
};

const CORRELATION_WINDOW_MINUTES = 15;

function severityRank(severity: string): number {
  return SEVERITY_WEIGHT[severity] ?? 20;
}

function maxSeverity(a: string, b: string): string {
  return severityRank(a) >= severityRank(b) ? a : b;
}

function computeRiskScore(severity: string, confidence: number, criticality: number): number {
  const score = severityRank(severity) * confidence + criticality * 2;
  return Math.max(0, Math.min(100, Math.round(score)));
}

type IncidentRow = {
  id: string;
  title: string;
  severity: string;
  status: string;
  confidence: number;
  risk_score: number;
  risk_explanation: Record<string, unknown>;
  approval_state: string;
  created_at: Date;
  updated_at: Date;
};

function mapIncidentRow(row: IncidentRow): PersistedIncident {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    confidence: row.confidence,
    riskScore: row.risk_score,
    riskExplanation: row.risk_explanation,
    approvalState: row.approval_state,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

async function getAssetCriticality(assetId: string): Promise<number> {
  const result = await pool.query<{ criticality: number }>(
    `SELECT criticality FROM assets WHERE id = $1`,
    [assetId]
  );

  return result.rows[0]?.criticality ?? 1;
}

async function findOrCreateIncident(
  assetId: string,
  candidate: DetectionCandidate,
  criticality: number
): Promise<{ record: PersistedIncident; isNew: boolean }> {
  const existing = await pool.query<IncidentRow>(
    `
      SELECT i.id, i.title, i.severity, i.status, i.confidence, i.risk_score, i.risk_explanation, i.approval_state, i.created_at, i.updated_at
      FROM incidents i
      JOIN detections d ON d.incident_id = i.id
      WHERE d.asset_id = $1
        AND i.status IN ('open', 'investigating')
        AND i.updated_at > now() - make_interval(mins => $2)
      ORDER BY i.updated_at DESC
      LIMIT 1
    `,
    [assetId, CORRELATION_WINDOW_MINUTES]
  );

  const riskScore = computeRiskScore(candidate.severity, candidate.confidence, criticality);
  const current = existing.rows[0];

  if (current) {
    const updated = await pool.query<IncidentRow>(
      `
        UPDATE incidents
        SET severity = $1, risk_score = $2, confidence = $3, updated_at = now()
        WHERE id = $4
        RETURNING id, title, severity, status, confidence, risk_score, risk_explanation, approval_state, created_at, updated_at
      `,
      [
        maxSeverity(current.severity, candidate.severity),
        Math.max(current.risk_score, riskScore),
        Math.max(current.confidence, candidate.confidence),
        current.id
      ]
    );

    const row = updated.rows[0];

    if (!row) {
      throw new Error("Incident update did not return a row");
    }

    return { isNew: false, record: mapIncidentRow(row) };
  }

  const incidentId = randomUUID();
  const title = `${candidate.type.replace(/_/g, " ")} on ${assetId}`;
  const riskExplanation = {
    severityWeight: severityRank(candidate.severity),
    confidence: candidate.confidence,
    assetCriticality: criticality
  };

  const created = await pool.query<IncidentRow>(
    `
      INSERT INTO incidents (id, title, severity, status, confidence, risk_score, risk_explanation)
      VALUES ($1, $2, $3, 'open', $4, $5, $6::jsonb)
      RETURNING id, title, severity, status, confidence, risk_score, risk_explanation, approval_state, created_at, updated_at
    `,
    [incidentId, title, candidate.severity, candidate.confidence, riskScore, JSON.stringify(riskExplanation)]
  );

  const row = created.rows[0];

  if (!row) {
    throw new Error("Incident insert did not return a row");
  }

  return { isNew: true, record: mapIncidentRow(row) };
}

type DetectionRow = {
  id: string;
  type: string;
  severity: string;
  asset_id: string;
  confidence: number;
  evidence: string[];
  event_ids: string[];
  incident_id: string | null;
  created_at: Date;
};

function mapDetectionRow(row: DetectionRow): PersistedDetection {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    assetId: row.asset_id,
    confidence: row.confidence,
    evidence: row.evidence,
    eventIds: row.event_ids,
    incidentId: row.incident_id,
    createdAt: row.created_at.toISOString()
  };
}

async function recordDetection(
  assetId: string,
  candidate: DetectionCandidate,
  event: PersistedEvent
): Promise<DetectionResult> {
  const criticality = await getAssetCriticality(assetId);
  const incident = await findOrCreateIncident(assetId, candidate, criticality);

  const detectionId = randomUUID();
  const detectionResult = await pool.query<DetectionRow>(
    `
      INSERT INTO detections (id, type, severity, asset_id, confidence, evidence, event_ids, incident_id)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8)
      RETURNING id, type, severity, asset_id, confidence, evidence, event_ids, incident_id, created_at
    `,
    [
      detectionId,
      candidate.type,
      candidate.severity,
      assetId,
      candidate.confidence,
      JSON.stringify(candidate.evidence),
      JSON.stringify([event.id]),
      incident.record.id
    ]
  );

  const row = detectionResult.rows[0];

  if (!row) {
    throw new Error("Detection insert did not return a row");
  }

  await pool.query(
    `
      INSERT INTO incident_events (incident_id, event_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [incident.record.id, event.id]
  );

  return {
    detection: mapDetectionRow(row),
    incident: incident.record,
    incidentIsNew: incident.isNew
  };
}

export async function evaluateEvent(event: PersistedEvent): Promise<DetectionResult[]> {
  const assetId = event.destinationAssetId ?? event.sourceAssetId;

  if (!assetId) {
    return [];
  }

  const results: DetectionResult[] = [];

  for (const rule of detectionRules) {
    const candidate = rule(event);

    if (!candidate) {
      continue;
    }

    results.push(await recordDetection(assetId, candidate, event));
  }

  return results;
}

export async function getRecentDetections(limit = 50): Promise<PersistedDetection[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const result = await pool.query<DetectionRow>(
    `
      SELECT id, type, severity, asset_id, confidence, evidence, event_ids, incident_id, created_at
      FROM detections
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map(mapDetectionRow);
}

export async function markIncidentInvestigating(incidentId: string): Promise<PersistedIncident | null> {
  const result = await pool.query<IncidentRow>(
    `
      UPDATE incidents
      SET status = 'investigating', updated_at = now()
      WHERE id = $1 AND status = 'open'
      RETURNING id, title, severity, status, confidence, risk_score, risk_explanation, approval_state, created_at, updated_at
    `,
    [incidentId]
  );

  const row = result.rows[0];
  return row ? mapIncidentRow(row) : null;
}

// Derives incidents.approval_state from the current state of its response_actions.
export async function recomputeIncidentApprovalState(incidentId: string): Promise<PersistedIncident | null> {
  const result = await pool.query<IncidentRow>(
    `
      UPDATE incidents
      SET approval_state = CASE
            WHEN EXISTS (SELECT 1 FROM response_actions WHERE incident_id = $1 AND approval_state = 'pending') THEN 'pending'
            WHEN EXISTS (SELECT 1 FROM response_actions WHERE incident_id = $1 AND approval_state = 'approved') THEN 'approved'
            WHEN EXISTS (SELECT 1 FROM response_actions WHERE incident_id = $1) THEN 'rejected'
            ELSE approval_state
          END,
          updated_at = now()
      WHERE id = $1
      RETURNING id, title, severity, status, confidence, risk_score, risk_explanation, approval_state, created_at, updated_at
    `,
    [incidentId]
  );

  const row = result.rows[0];
  return row ? mapIncidentRow(row) : null;
}

export async function getRecentIncidents(limit = 50): Promise<PersistedIncident[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const result = await pool.query<IncidentRow>(
    `
      SELECT id, title, severity, status, confidence, risk_score, risk_explanation, approval_state, created_at, updated_at
      FROM incidents
      ORDER BY updated_at DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map(mapIncidentRow);
}
