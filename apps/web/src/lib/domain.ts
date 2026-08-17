export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type PersistedEvent = {
  id: string;
  timestamp: string;
  eventType: string;
  severity: Severity;
  sourceAssetId: string | null;
  destinationAssetId: string | null;
  sourceIp: string | null;
  destinationIp: string | null;
  user: string | null;
  description: string;
  metadata: Record<string, unknown>;
  simulated: boolean;
  scenarioId: string | null;
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
  status: "open" | "investigating" | "contained" | "resolved";
  confidence: number;
  riskScore: number;
  riskExplanation: Record<string, unknown>;
  approvalState: "none" | "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
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

export type PersistedResponseAction = {
  id: string;
  incidentId: string;
  actionType: string;
  reason: string;
  approvalState: "pending" | "approved" | "rejected";
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  executionResult: Record<string, unknown>;
  createdAt: string;
};

export type DetectionCandidate = {
  type: string;
  severity: Exclude<Severity, "info">;
  confidence: number;
  evidence: string[];
};