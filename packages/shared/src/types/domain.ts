export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AssetStatus = "healthy" | "warning" | "critical" | "offline";

export type IncidentStatus = "open" | "investigating" | "contained" | "resolved";

export type EventType =
  | "authentication"
  | "network_connection"
  | "configuration_change"
  | "plc_command"
  | "firmware_change"
  | "process_change"
  | "sensor_change"
  | "privilege_change"
  | "remote_access"
  | "asset_discovery"
  | "vulnerability"
  | "system_alert";

export type NetworkZone = "corporate" | "perimeter" | "ot" | "engineering" | "field";

export interface Asset {
  id: string;
  name: string;
  type: string;
  category: "ot" | "it";
  ipAddress: string;
  zone: NetworkZone;
  status: AssetStatus;
  criticality: number;
  version?: string;
  lastSeenAt: string;
  baselineBehavior: string[];
}

export interface OtEvent {
  id: string;
  timestamp: string;
  eventType: EventType;
  severity: Severity;
  sourceAssetId?: string;
  destinationAssetId?: string;
  sourceIp?: string;
  destinationIp?: string;
  user?: string;
  description: string;
  metadata: Record<string, unknown>;
  simulated: boolean;
  scenarioId?: string;
}

export interface DetectionFinding {
  id: string;
  type: string;
  severity: Severity;
  confidence: number;
  assetId: string;
  evidence: string[];
  eventIds: string[];
  createdAt: string;
}

export interface RiskScore {
  score: number;
  severity: Exclude<Severity, "info">;
  confidence: number;
  factors: Array<{ label: string; value: number; weight: number; contribution: number }>;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  confidence: number;
  affectedAssetIds: string[];
  detectionSources: string[];
  eventIds: string[];
  timeline: OtEvent[];
  risk: RiskScore;
  createdAt: string;
  updatedAt: string;
}
