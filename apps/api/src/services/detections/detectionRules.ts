import type { PersistedEvent } from "../events/eventService.js";

export type DetectionSeverity = "critical" | "high" | "medium" | "low";

export type DetectionCandidate = {
  type: string;
  severity: DetectionSeverity;
  confidence: number;
  evidence: string[];
};

export type DetectionRule = (event: PersistedEvent) => DetectionCandidate | null;

const offHoursAuthentication: DetectionRule = (event) => {
  if (event.eventType !== "authentication" || event.metadata.unusualHour !== true) {
    return null;
  }

  return {
    type: "off_hours_authentication",
    severity: "medium",
    confidence: 0.6,
    evidence: [`Authentication by ${event.user ?? "unknown user"} occurred outside the approved maintenance window.`]
  };
};

const unapprovedRemoteAccess: DetectionRule = (event) => {
  if (event.eventType !== "remote_access" || event.metadata.approvedHost !== false) {
    return null;
  }

  return {
    type: "unapproved_remote_access",
    severity: "high",
    confidence: 0.75,
    evidence: ["Remote session established from a host that is not on the approved allowlist."]
  };
};

const unauthorizedConfigurationChange: DetectionRule = (event) => {
  if (event.eventType !== "configuration_change" || event.metadata.approvedWindow !== false) {
    return null;
  }

  return {
    type: "unauthorized_configuration_change",
    severity: "critical",
    confidence: 0.85,
    evidence: ["Configuration change applied outside an approved change window."]
  };
};

const abnormalPlcCommandSequence: DetectionRule = (event) => {
  const sequence = event.metadata.sequence;

  if (event.eventType !== "plc_command" || !Array.isArray(sequence)) {
    return null;
  }

  const flagged = sequence.some((step) => step === "override" || step === "force_apply");

  if (!flagged) {
    return null;
  }

  return {
    type: "abnormal_plc_command_sequence",
    severity: "high",
    confidence: 0.7,
    evidence: [`PLC command sequence included override/force-apply steps: ${sequence.join(" -> ")}.`]
  };
};

const unauthorizedPrivilegeChange: DetectionRule = (event) => {
  if (event.eventType !== "privilege_change" || event.metadata.approved !== false) {
    return null;
  }

  return {
    type: "unauthorized_privilege_change",
    severity: "critical",
    confidence: 0.8,
    evidence: ["Privilege change applied without operator approval."]
  };
};

export const detectionRules: DetectionRule[] = [
  offHoursAuthentication,
  unapprovedRemoteAccess,
  unauthorizedConfigurationChange,
  abnormalPlcCommandSequence,
  unauthorizedPrivilegeChange
];
