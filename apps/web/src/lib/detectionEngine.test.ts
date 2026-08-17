import { describe, expect, it } from "vitest";
import { applyDetections, evaluateEvent } from "./detectionEngine";
import type { PersistedEvent } from "./domain";
import { scenarioSteps, type ScenarioEventInput } from "./scenarios";

function createEvent(input: ScenarioEventInput): PersistedEvent {
  return {
    ...input,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    sourceIp: null,
    destinationIp: null,
    simulated: true,
    scenarioId: "test"
  };
}

describe("scenario detection coverage", () => {
  const expectedFindings: Record<string, string[]> = {
    "unauthorized-plc-configuration-change": [
      "off_hours_authentication",
      "unapproved_remote_access",
      "unauthorized_configuration_change",
      "abnormal_plc_command_sequence"
    ],
    "compromised-operator-credentials": [
      "off_hours_authentication",
      "unauthorized_privilege_change",
      "unapproved_remote_access"
    ],
    "unexpected-remote-access": ["unapproved_remote_access"],
    "abnormal-plc-communication": ["abnormal_plc_command_sequence"],
    "multi-asset-anomaly": [
      "off_hours_authentication",
      "unapproved_remote_access",
      "unauthorized_configuration_change"
    ]
  };

  for (const [scenarioId, expected] of Object.entries(expectedFindings)) {
    it(`${scenarioId} emits its expected deterministic findings`, () => {
      const steps = scenarioSteps.get(scenarioId);
      expect(steps).toBeDefined();

      const findings = steps!.flatMap((step) => evaluateEvent(createEvent(step.event)).map((item) => item.type));
      expect(findings).toEqual(expect.arrayContaining(expected));
    });
  }
});

describe("incident correlation", () => {
  it("updates the same asset incident within the correlation window", () => {
    const initialEvent = createEvent({
      eventType: "remote_access",
      severity: "high",
      sourceAssetId: "ENG-01",
      destinationAssetId: "PLC-03",
      user: null,
      description: "Unapproved remote session.",
      metadata: { approvedHost: false }
    });
    const firstResult = applyDetections(initialEvent, []);
    const followUpEvent = createEvent({
      eventType: "configuration_change",
      severity: "critical",
      sourceAssetId: "ENG-01",
      destinationAssetId: "PLC-03",
      user: null,
      description: "Unapproved configuration change.",
      metadata: { approvedWindow: false }
    });
    const secondResult = applyDetections(followUpEvent, firstResult.incidents);

    expect(secondResult.incidents).toHaveLength(1);
    expect(secondResult.incidents[0]).toMatchObject({ severity: "critical", riskScore: 87 });
  });
});