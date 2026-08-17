import type { PersistedEvent, Severity } from "./domain";

export type ScenarioDefinition = {
  id: string;
  name: string;
  severity: Severity;
  eventType: string;
  description: string;
};

export type ScenarioEventInput = Omit<
  PersistedEvent,
  "id" | "timestamp" | "sourceIp" | "destinationIp" | "simulated" | "scenarioId"
>;

export type ScenarioStep = {
  delayMs: number;
  event: ScenarioEventInput;
};

type Scenario = ScenarioDefinition & {
  steps: ScenarioStep[];
};

const scenarioDefinitions: Scenario[] = [
  {
    id: "unauthorized-plc-configuration-change",
    name: "Scenario 1: Unauthorized PLC Configuration Change",
    severity: "critical",
    eventType: "configuration_change",
    description:
      "Unusual remote authentication precedes a critical PLC configuration update outside approved maintenance windows.",
    steps: [
      {
        delayMs: 0,
        event: {
          eventType: "authentication",
          severity: "medium",
          sourceAssetId: "ENG-01",
          destinationAssetId: "AUTH-01",
          user: "eng.temp",
          description: "Authentication attempt observed outside maintenance window.",
          metadata: { result: "success", unusualHour: true }
        }
      },
      {
        delayMs: 2000,
        event: {
          eventType: "remote_access",
          severity: "high",
          sourceAssetId: "ENG-01",
          destinationAssetId: "PLC-03",
          user: null,
          description: "New remote session established to chemical treatment PLC.",
          metadata: { protocol: "remote_service", approvedHost: false }
        }
      },
      {
        delayMs: 4000,
        event: {
          eventType: "configuration_change",
          severity: "critical",
          sourceAssetId: "ENG-01",
          destinationAssetId: "PLC-03",
          user: null,
          description: "PLC configuration updated from non-approved workstation.",
          metadata: { parameter: "dosage_profile", approvedWindow: false }
        }
      },
      {
        delayMs: 6000,
        event: {
          eventType: "plc_command",
          severity: "high",
          sourceAssetId: "PLC-03",
          destinationAssetId: "SENSOR-01",
          user: null,
          description: "PLC issued abnormal command sequence after configuration change.",
          metadata: { sequence: ["set_mode", "override", "force_apply"] }
        }
      },
      {
        delayMs: 8000,
        event: {
          eventType: "process_change",
          severity: "high",
          sourceAssetId: "PLC-03",
          destinationAssetId: "HMI-01",
          user: null,
          description: "Chemical dosage drift detected outside normal tolerance.",
          metadata: { deviationPercent: 14.2 }
        }
      }
    ]
  },
  {
    id: "compromised-operator-credentials",
    name: "Scenario 2: Compromised Operator Credentials",
    severity: "high",
    eventType: "authentication",
    description:
      "Repeated failed logins are followed by a successful operator authentication from an unfamiliar source and privilege elevation.",
    steps: [
      {
        delayMs: 0,
        event: {
          eventType: "authentication",
          severity: "medium",
          sourceAssetId: "OPS-01",
          destinationAssetId: "AUTH-01",
          user: "operator.nriver",
          description: "Multiple failed authentication attempts detected.",
          metadata: { result: "failure", attempts: 6, unusualHour: true }
        }
      },
      {
        delayMs: 1800,
        event: {
          eventType: "authentication",
          severity: "high",
          sourceAssetId: "OPS-01",
          destinationAssetId: "AUTH-01",
          user: "operator.nriver",
          description: "Authentication succeeds after repeated failures.",
          metadata: { result: "success", sourceKnown: false }
        }
      },
      {
        delayMs: 3500,
        event: {
          eventType: "privilege_change",
          severity: "high",
          sourceAssetId: "AUTH-01",
          destinationAssetId: "OPS-01",
          user: "operator.nriver",
          description: "Unexpected privilege elevation granted to operator account.",
          metadata: { fromRole: "operator", toRole: "admin", approved: false }
        }
      },
      {
        delayMs: 5200,
        event: {
          eventType: "remote_access",
          severity: "high",
          sourceAssetId: "OPS-01",
          destinationAssetId: "HMI-01",
          user: "operator.nriver",
          description: "Elevated operator account accessed HMI from unusual source.",
          metadata: { sourceKnown: false, approvedHost: false }
        }
      },
      {
        delayMs: 7000,
        event: {
          eventType: "network_connection",
          severity: "medium",
          sourceAssetId: "OPS-01",
          destinationAssetId: "PLC-01",
          user: null,
          description: "Credentialed workstation initiated direct PLC connection outside baseline.",
          metadata: { baselineAllowed: false }
        }
      }
    ]
  },
  {
    id: "unexpected-remote-access",
    name: "Scenario 3: Unexpected Remote Access",
    severity: "high",
    eventType: "remote_access",
    description:
      "A previously unseen remote source connects to critical OT assets outside normal operational hours.",
    steps: [
      {
        delayMs: 0,
        event: {
          eventType: "remote_access",
          severity: "high",
          sourceAssetId: null,
          destinationAssetId: "OPS-01",
          user: null,
          description: "Previously unseen remote source connected to operations workstation.",
          metadata: { sourceKnown: false, approvedHost: false }
        }
      },
      {
        delayMs: 2000,
        event: {
          eventType: "network_connection",
          severity: "high",
          sourceAssetId: "OPS-01",
          destinationAssetId: "SCADA-01",
          user: null,
          description: "Unexpected lateral connection from remote session to SCADA.",
          metadata: { offHours: true }
        }
      },
      {
        delayMs: 4200,
        event: {
          eventType: "network_connection",
          severity: "high",
          sourceAssetId: "SCADA-01",
          destinationAssetId: "PLC-05",
          user: null,
          description: "Critical OT asset communication triggered during abnormal remote session.",
          metadata: { criticalAsset: true }
        }
      },
      {
        delayMs: 6100,
        event: {
          eventType: "asset_discovery",
          severity: "medium",
          sourceAssetId: "OPS-01",
          destinationAssetId: "PLC-05",
          user: null,
          description: "Remote session attempted unexpected asset enumeration.",
          metadata: { scanPattern: "sequential" }
        }
      },
      {
        delayMs: 8000,
        event: {
          eventType: "system_alert",
          severity: "high",
          sourceAssetId: null,
          destinationAssetId: "FW-01",
          user: null,
          description: "Firewall observed unusual OT access outside authorized route.",
          metadata: { ruleMatched: "unexpected-remote-ot" }
        }
      }
    ]
  },
  {
    id: "abnormal-plc-communication",
    name: "Scenario 4: Abnormal PLC Communication",
    severity: "medium",
    eventType: "plc_command",
    description:
      "PLC command cadence and destination patterns deviate from baseline profile.",
    steps: [
      {
        delayMs: 0,
        event: {
          eventType: "network_connection",
          severity: "medium",
          sourceAssetId: "PLC-02",
          destinationAssetId: "ENG-01",
          user: null,
          description: "PLC initiated communication with non-baseline engineering host.",
          metadata: { baselineAllowed: false }
        }
      },
      {
        delayMs: 1600,
        event: {
          eventType: "network_connection",
          severity: "high",
          sourceAssetId: "PLC-02",
          destinationAssetId: "ENG-01",
          user: null,
          description: "Communication frequency exceeded expected threshold.",
          metadata: { observedPerMinute: 180, baselinePerMinute: 24 }
        }
      },
      {
        delayMs: 3200,
        event: {
          eventType: "plc_command",
          severity: "high",
          sourceAssetId: "ENG-01",
          destinationAssetId: "PLC-02",
          user: null,
          description: "Unexpected PLC command sequence detected.",
          metadata: { sequence: ["write_coil", "override", "force_apply"] }
        }
      },
      {
        delayMs: 5000,
        event: {
          eventType: "process_change",
          severity: "high",
          sourceAssetId: "PLC-02",
          destinationAssetId: "SENSOR-02",
          user: null,
          description: "Pump station process behavior deviated from baseline profile.",
          metadata: { pumpDutyCyclePercent: 96 }
        }
      },
      {
        delayMs: 6800,
        event: {
          eventType: "system_alert",
          severity: "high",
          sourceAssetId: null,
          destinationAssetId: "SCADA-01",
          user: null,
          description: "SCADA flagged sustained abnormal PLC communications.",
          metadata: { detector: "comm-frequency" }
        }
      }
    ]
  },
  {
    id: "multi-asset-anomaly",
    name: "Scenario 5: Multi-Asset Anomaly",
    severity: "critical",
    eventType: "system_alert",
    description:
      "Multiple correlated abnormalities appear across authentication, network access, and PLC command behavior.",
    steps: [
      {
        delayMs: 0,
        event: {
          eventType: "authentication",
          severity: "medium",
          sourceAssetId: "OPS-01",
          destinationAssetId: "AUTH-01",
          user: null,
          description: "Failed logins exceeded threshold.",
          metadata: { failures: 5, unusualHour: true }
        }
      },
      {
        delayMs: 1600,
        event: {
          eventType: "remote_access",
          severity: "high",
          sourceAssetId: null,
          destinationAssetId: "OPS-01",
          user: null,
          description: "Unusual remote access established from new source.",
          metadata: { sourceKnown: false, approvedHost: false }
        }
      },
      {
        delayMs: 3300,
        event: {
          eventType: "configuration_change",
          severity: "critical",
          sourceAssetId: "OPS-01",
          destinationAssetId: "PLC-03",
          user: null,
          description: "Critical PLC configuration changed unexpectedly.",
          metadata: { changeType: "setpoint_override", approvedWindow: false }
        }
      },
      {
        delayMs: 5200,
        event: {
          eventType: "network_connection",
          severity: "high",
          sourceAssetId: "PLC-03",
          destinationAssetId: "FW-01",
          user: null,
          description: "PLC attempted outbound communication to unexpected host path.",
          metadata: { baselineAllowed: false }
        }
      },
      {
        delayMs: 7000,
        event: {
          eventType: "sensor_change",
          severity: "high",
          sourceAssetId: "SENSOR-01",
          destinationAssetId: "PLC-03",
          user: null,
          description: "Tank level fluctuations exceeded expected operating envelope.",
          metadata: { deviationPercent: 11.5 }
        }
      }
    ]
  }
];

export const scenarios: ScenarioDefinition[] = scenarioDefinitions.map(({ steps: _steps, ...scenario }) => scenario);

export const scenarioSteps = new Map(scenarioDefinitions.map((scenario) => [scenario.id, scenario.steps]));
