import type { DetectionCandidate, PersistedDetection, PersistedEvent, PersistedIncident, Severity } from "./domain";

const SEVERITY_WEIGHT: Record<Exclude<Severity, "info">, number> = {
  critical: 90,
  high: 70,
  medium: 50,
  low: 30
};

const CORRELATION_WINDOW_MS = 15 * 60 * 1000;

export const assetCriticality: Record<string, number> = {
  "AUTH-01": 2,
  "ENG-01": 2,
  "FW-01": 3,
  "HMI-01": 4,
  "OPS-01": 3,
  "PLC-01": 5,
  "PLC-02": 5,
  "PLC-03": 5,
  "PLC-05": 5,
  "SCADA-01": 5,
  "SENSOR-01": 3,
  "SENSOR-02": 3
};

function severityRank(severity: Severity): number {
  return severity === "info" ? 20 : SEVERITY_WEIGHT[severity];
}

function maxSeverity(first: Severity, second: Severity): Severity {
  return severityRank(first) >= severityRank(second) ? first : second;
}

export function computeRiskScore(severity: Exclude<Severity, "info">, confidence: number, criticality: number): number {
  return Math.max(0, Math.min(100, Math.round(SEVERITY_WEIGHT[severity] * confidence + criticality * 2)));
}

export function evaluateEvent(event: PersistedEvent): DetectionCandidate[] {
  const candidates: DetectionCandidate[] = [];

  if (event.eventType === "authentication" && event.metadata.unusualHour === true) {
    candidates.push({
      type: "off_hours_authentication",
      severity: "medium",
      confidence: 0.6,
      evidence: [`Authentication by ${event.user ?? "unknown user"} occurred outside the approved maintenance window.`]
    });
  }

  if (event.eventType === "remote_access" && event.metadata.approvedHost === false) {
    candidates.push({
      type: "unapproved_remote_access",
      severity: "high",
      confidence: 0.75,
      evidence: ["Remote session established from a host that is not on the approved allowlist."]
    });
  }

  if (event.eventType === "configuration_change" && event.metadata.approvedWindow === false) {
    candidates.push({
      type: "unauthorized_configuration_change",
      severity: "critical",
      confidence: 0.85,
      evidence: ["Configuration change applied outside an approved change window."]
    });
  }

  const sequence = event.metadata.sequence;
  if (
    event.eventType === "plc_command" &&
    Array.isArray(sequence) &&
    sequence.some((step) => step === "override" || step === "force_apply")
  ) {
    candidates.push({
      type: "abnormal_plc_command_sequence",
      severity: "high",
      confidence: 0.7,
      evidence: [`PLC command sequence included override/force-apply steps: ${sequence.join(" -> ")}.`]
    });
  }

  if (event.eventType === "privilege_change" && event.metadata.approved === false) {
    candidates.push({
      type: "unauthorized_privilege_change",
      severity: "critical",
      confidence: 0.8,
      evidence: ["Privilege change applied without operator approval."]
    });
  }

  return candidates;
}

export function applyDetections(
  event: PersistedEvent,
  incidents: PersistedIncident[]
): { detections: PersistedDetection[]; incidents: PersistedIncident[] } {
  const assetId = event.destinationAssetId ?? event.sourceAssetId;
  if (!assetId) {
    return { detections: [], incidents };
  }

  const nextIncidents = [...incidents];
  const detections = evaluateEvent(event).map((candidate) => {
    const createdAt = new Date().toISOString();
    const criticality = assetCriticality[assetId] ?? 1;
    const riskScore = computeRiskScore(candidate.severity, candidate.confidence, criticality);
    const existingIndex = nextIncidents.findIndex(
      (incident) =>
        incident.status !== "resolved" &&
        incident.riskExplanation.assetId === assetId &&
        Date.parse(createdAt) - Date.parse(incident.updatedAt) <= CORRELATION_WINDOW_MS
    );
    let incident: PersistedIncident;

    if (existingIndex >= 0) {
      const existing = nextIncidents[existingIndex]!;
      incident = {
        ...existing,
        severity: maxSeverity(existing.severity, candidate.severity),
        confidence: Math.max(existing.confidence, candidate.confidence),
        riskScore: Math.max(existing.riskScore, riskScore),
        updatedAt: createdAt
      };
      nextIncidents[existingIndex] = incident;
    } else {
      incident = {
        id: crypto.randomUUID(),
        title: `${candidate.type.replace(/_/g, " ")} on ${assetId}`,
        severity: candidate.severity,
        status: "open",
        confidence: candidate.confidence,
        riskScore,
        riskExplanation: {
          assetId,
          severityWeight: SEVERITY_WEIGHT[candidate.severity],
          confidence: candidate.confidence,
          assetCriticality: criticality
        },
        approvalState: "none",
        createdAt,
        updatedAt: createdAt
      };
      nextIncidents.unshift(incident);
    }

    return {
      id: crypto.randomUUID(),
      type: candidate.type,
      severity: candidate.severity,
      assetId,
      confidence: candidate.confidence,
      evidence: candidate.evidence,
      eventIds: [event.id],
      incidentId: incident.id,
      createdAt
    };
  });

  return { detections, incidents: nextIncidents };
}