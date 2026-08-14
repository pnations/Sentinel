import { randomUUID } from "node:crypto";
import { pool } from "../../db/client.js";
import { createEvent, type CreateEventInput, type PersistedEvent } from "../events/eventService.js";
import { evaluateEvent } from "../detections/detectionService.js";
import type { SseBroker } from "../streaming/sseBroker.js";

type AssetRecord = {
  id: string;
  ip_address: string;
};

type SimulationStatus = {
  normalOperationsRunning: boolean;
  normalOperationsIntervalMs: number;
  activeScenarioRuns: number;
};

type ScenarioStep = {
  delayMs: number;
  event: CreateEventInput;
};

const DEFAULT_INTERVAL_MS = 4_000;

export class SimulationService {
  private readonly sseBroker: SseBroker;
  private normalOperationsTimer: NodeJS.Timeout | null = null;
  private normalOperationsIntervalMs = DEFAULT_INTERVAL_MS;
  private scenarioRunTimers = new Map<string, NodeJS.Timeout[]>();
  private assetMap: Map<string, AssetRecord> | null = null;

  constructor(sseBroker: SseBroker) {
    this.sseBroker = sseBroker;
  }

  async getStatus(): Promise<SimulationStatus> {
    return {
      normalOperationsRunning: this.normalOperationsTimer !== null,
      normalOperationsIntervalMs: this.normalOperationsIntervalMs,
      activeScenarioRuns: this.scenarioRunTimers.size
    };
  }

  async startNormalOperations(intervalMs?: number): Promise<SimulationStatus> {
    this.stopNormalOperations();

    const requested = intervalMs ?? DEFAULT_INTERVAL_MS;
    this.normalOperationsIntervalMs = Math.min(Math.max(requested, 1_000), 30_000);

    // Emit one event first so startup fails fast if dependencies (like DB) are unavailable.
    await this.emitNormalOperationEvent();

    this.normalOperationsTimer = setInterval(() => {
      void this.emitNormalOperationEvent();
    }, this.normalOperationsIntervalMs);

    return this.getStatus();
  }

  stopNormalOperations(): SimulationStatus {
    if (this.normalOperationsTimer) {
      clearInterval(this.normalOperationsTimer);
      this.normalOperationsTimer = null;
    }

    return {
      normalOperationsRunning: false,
      normalOperationsIntervalMs: this.normalOperationsIntervalMs,
      activeScenarioRuns: this.scenarioRunTimers.size
    };
  }

  async emitManualEvent(event: CreateEventInput): Promise<PersistedEvent> {
    const withIps = await this.enrichWithAssetIps(event);
    const stored = await createEvent({
      ...withIps,
      metadata: {
        ...withIps.metadata,
        mode: "manual"
      },
      simulated: true
    });

    this.publish(stored);
    await this.runDetections(stored);
    return stored;
  }

  async runScenario(scenarioId: string): Promise<{ runId: string; stepCount: number }> {
    const runId = randomUUID();
    const steps = await this.buildScenarioSteps(scenarioId);

    if (steps.length === 0) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }

    await pool.query(
      `
        INSERT INTO simulation_runs (id, scenario_id, status, metadata)
        VALUES ($1::uuid, $2, 'running', $3::jsonb)
      `,
      [runId, scenarioId, JSON.stringify({ stepCount: steps.length })]
    );

    const timers = steps.map((step) =>
      setTimeout(() => {
        void this.emitScenarioStep(scenarioId, step.event);
      }, step.delayMs)
    );

    const completionDelayMs = Math.max(...steps.map((step) => step.delayMs), 0) + 50;
    const completionTimer = setTimeout(() => {
      void pool.query(
        `
          UPDATE simulation_runs
          SET status = 'completed', ended_at = now()
          WHERE id = $1::uuid
        `,
        [runId]
      );
      this.scenarioRunTimers.delete(runId);
    }, completionDelayMs);

    timers.push(completionTimer);
    this.scenarioRunTimers.set(runId, timers);

    return { runId, stepCount: steps.length };
  }

  async listScenarios(): Promise<Array<{ id: string; name: string; description: string; severity: string }>> {
    const result = await pool.query<{ id: string; name: string; description: string; severity: string }>(
      `
        SELECT id, name, description, severity
        FROM attack_scenarios
        WHERE enabled = true
        ORDER BY name ASC
      `
    );

    return result.rows;
  }

  stopAll(): void {
    this.stopNormalOperations();

    for (const timers of this.scenarioRunTimers.values()) {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    }

    this.scenarioRunTimers.clear();
  }

  private async emitScenarioStep(scenarioId: string, event: CreateEventInput): Promise<void> {
    const withIps = await this.enrichWithAssetIps(event);
    const stored = await createEvent({
      ...withIps,
      scenarioId,
      simulated: true,
      metadata: {
        ...withIps.metadata,
        mode: "scenario"
      }
    });

    this.publish(stored);
    await this.runDetections(stored);
  }

  private async emitNormalOperationEvent(): Promise<void> {
    const templates: CreateEventInput[] = [
      {
        eventType: "network_connection",
        severity: "low",
        sourceAssetId: "SCADA-01",
        destinationAssetId: "PLC-02",
        description: "SCADA polling cycle completed for Pump Station PLC.",
        metadata: { protocol: "modbus/tcp", direction: "scada_to_plc", intervalSeconds: 5 }
      },
      {
        eventType: "sensor_change",
        severity: "info",
        sourceAssetId: "SENSOR-02",
        destinationAssetId: "PLC-04",
        description: "Flow sensor update accepted within expected threshold.",
        metadata: { measurement: "flow_rate", units: "gpm", baselineRange: [440, 470] }
      },
      {
        eventType: "authentication",
        severity: "low",
        sourceAssetId: "OPS-01",
        destinationAssetId: "AUTH-01",
        user: "operator.nriver",
        description: "Operator session refresh completed during scheduled shift.",
        metadata: { method: "kerberos", result: "success", shift: "day" }
      },
      {
        eventType: "plc_command",
        severity: "info",
        sourceAssetId: "HMI-01",
        destinationAssetId: "PLC-01",
        description: "HMI acknowledged intake valve control heartbeat.",
        metadata: { command: "heartbeat_ack", cycleMs: 900 }
      },
      {
        eventType: "process_change",
        severity: "low",
        sourceAssetId: "PLC-03",
        destinationAssetId: "SENSOR-01",
        description: "Chemical treatment dosage adjusted within baseline profile.",
        metadata: { parameter: "chlorine_ppm", change: 0.04, baselineWindow: "00:00-23:59" }
      }
    ];

    const template = templates[Math.floor(Math.random() * templates.length)];

    if (!template) {
      return;
    }

    const withIps = await this.enrichWithAssetIps(template);
    const stored = await createEvent({
      ...withIps,
      scenarioId: "normal-operations",
      simulated: true,
      metadata: {
        ...withIps.metadata,
        mode: "normal"
      }
    });

    this.publish(stored);
    await this.runDetections(stored);
  }

  private async buildScenarioSteps(scenarioId: string): Promise<ScenarioStep[]> {
    const definitions: Record<string, ScenarioStep[]> = {
      "unauthorized-plc-configuration-change": [
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
            description: "Chemical dosage drift detected outside normal tolerance.",
            metadata: { deviationPercent: 14.2 }
          }
        }
      ],
      "compromised-operator-credentials": [
        {
          delayMs: 0,
          event: {
            eventType: "authentication",
            severity: "medium",
            sourceAssetId: "OPS-01",
            destinationAssetId: "AUTH-01",
            user: "operator.nriver",
            description: "Multiple failed authentication attempts detected.",
            metadata: { result: "failure", attempts: 6 }
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
            metadata: { fromRole: "operator", toRole: "admin" }
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
            metadata: { sourceKnown: false }
          }
        },
        {
          delayMs: 7000,
          event: {
            eventType: "network_connection",
            severity: "medium",
            sourceAssetId: "OPS-01",
            destinationAssetId: "PLC-01",
            description: "Credentialed workstation initiated direct PLC connection outside baseline.",
            metadata: { baselineAllowed: false }
          }
        }
      ],
      "unexpected-remote-access": [
        {
          delayMs: 0,
          event: {
            eventType: "remote_access",
            severity: "high",
            sourceIp: "198.51.100.25",
            destinationAssetId: "OPS-01",
            description: "Previously unseen remote source connected to operations workstation.",
            metadata: { sourceKnown: false }
          }
        },
        {
          delayMs: 2000,
          event: {
            eventType: "network_connection",
            severity: "high",
            sourceAssetId: "OPS-01",
            destinationAssetId: "SCADA-01",
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
            description: "Remote session attempted unexpected asset enumeration.",
            metadata: { scanPattern: "sequential" }
          }
        },
        {
          delayMs: 8000,
          event: {
            eventType: "system_alert",
            severity: "high",
            destinationAssetId: "FW-01",
            description: "Firewall observed unusual OT access outside authorized route.",
            metadata: { ruleMatched: "unexpected-remote-ot" }
          }
        }
      ],
      "abnormal-plc-communication": [
        {
          delayMs: 0,
          event: {
            eventType: "network_connection",
            severity: "medium",
            sourceAssetId: "PLC-02",
            destinationAssetId: "ENG-01",
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
            description: "Unexpected PLC command sequence detected.",
            metadata: { sequence: ["write_coil", "override_mode", "force_run"] }
          }
        },
        {
          delayMs: 5000,
          event: {
            eventType: "process_change",
            severity: "high",
            sourceAssetId: "PLC-02",
            destinationAssetId: "SENSOR-02",
            description: "Pump station process behavior deviated from baseline profile.",
            metadata: { pumpDutyCyclePercent: 96 }
          }
        },
        {
          delayMs: 6800,
          event: {
            eventType: "system_alert",
            severity: "high",
            destinationAssetId: "SCADA-01",
            description: "SCADA flagged sustained abnormal PLC communications.",
            metadata: { detector: "comm-frequency" }
          }
        }
      ],
      "multi-asset-anomaly": [
        {
          delayMs: 0,
          event: {
            eventType: "authentication",
            severity: "medium",
            sourceAssetId: "OPS-01",
            destinationAssetId: "AUTH-01",
            description: "Failed logins exceeded threshold.",
            metadata: { failures: 5 }
          }
        },
        {
          delayMs: 1600,
          event: {
            eventType: "remote_access",
            severity: "high",
            sourceIp: "203.0.113.45",
            destinationAssetId: "OPS-01",
            description: "Unusual remote access established from new source.",
            metadata: { sourceKnown: false }
          }
        },
        {
          delayMs: 3300,
          event: {
            eventType: "configuration_change",
            severity: "critical",
            sourceAssetId: "OPS-01",
            destinationAssetId: "PLC-03",
            description: "Critical PLC configuration changed unexpectedly.",
            metadata: { changeType: "setpoint_override" }
          }
        },
        {
          delayMs: 5200,
          event: {
            eventType: "network_connection",
            severity: "high",
            sourceAssetId: "PLC-03",
            destinationAssetId: "FW-01",
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
            description: "Tank level fluctuations exceeded expected operating envelope.",
            metadata: { deviationPercent: 11.5 }
          }
        }
      ]
    };

    return definitions[scenarioId] ?? [];
  }

  private publish(event: PersistedEvent): void {
    this.sseBroker.publish({
      id: event.id,
      timestamp: event.timestamp,
      type: "event.created",
      payload: event
    });
  }

  private async runDetections(event: PersistedEvent): Promise<void> {
    try {
      const results = await evaluateEvent(event);

      for (const result of results) {
        this.sseBroker.publish({
          id: result.detection.id,
          timestamp: result.detection.createdAt,
          type: "finding.created",
          payload: result.detection
        });

        this.sseBroker.publish({
          id: result.incident.id,
          timestamp: result.incident.updatedAt,
          type: result.incidentIsNew ? "incident.created" : "incident.updated",
          payload: result.incident
        });
      }
    } catch (error) {
      // Detection failures must never block event ingestion or the SSE stream.
      console.error("[sentinelh20-api] detection evaluation failed", error);
    }
  }

  private async enrichWithAssetIps(event: CreateEventInput): Promise<CreateEventInput> {
    const assets = await this.getAssets();

    const sourceAsset = event.sourceAssetId ? assets.get(event.sourceAssetId) ?? null : null;
    const destinationAsset = event.destinationAssetId
      ? assets.get(event.destinationAssetId) ?? null
      : null;

    return {
      ...event,
      sourceIp: event.sourceIp ?? sourceAsset?.ip_address,
      destinationIp: event.destinationIp ?? destinationAsset?.ip_address
    };
  }

  private async getAssets(): Promise<Map<string, AssetRecord>> {
    if (this.assetMap) {
      return this.assetMap;
    }

    const result = await pool.query<AssetRecord>(
      `
        SELECT id, ip_address
        FROM assets
      `
    );

    this.assetMap = new Map(result.rows.map((row) => [row.id, row]));
    return this.assetMap;
  }
}
