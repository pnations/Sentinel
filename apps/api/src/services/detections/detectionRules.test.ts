import { describe, expect, it } from "vitest";
import { detectionRules } from "./detectionRules.js";
import type { PersistedEvent } from "../events/eventService.js";

const offHoursAuthentication = detectionRules[0]!;
const unapprovedRemoteAccess = detectionRules[1]!;
const unauthorizedConfigurationChange = detectionRules[2]!;
const abnormalPlcCommandSequence = detectionRules[3]!;
const unauthorizedPrivilegeChange = detectionRules[4]!;

function buildEvent(overrides: Partial<PersistedEvent>): PersistedEvent {
  return {
    id: "event-1",
    timestamp: new Date().toISOString(),
    eventType: "network_connection",
    severity: "low",
    sourceAssetId: "SCADA-01",
    destinationAssetId: "PLC-01",
    sourceIp: null,
    destinationIp: null,
    user: null,
    description: "test event",
    metadata: {},
    simulated: true,
    scenarioId: null,
    ...overrides
  };
}

describe("offHoursAuthentication", () => {
  it("matches authentication events flagged as unusual hour", () => {
    const event = buildEvent({ eventType: "authentication", metadata: { unusualHour: true } });
    expect(offHoursAuthentication(event)).not.toBeNull();
  });

  it("ignores authentication events within normal hours", () => {
    const event = buildEvent({ eventType: "authentication", metadata: { unusualHour: false } });
    expect(offHoursAuthentication(event)).toBeNull();
  });
});

describe("unapprovedRemoteAccess", () => {
  it("matches remote access from a non-approved host", () => {
    const event = buildEvent({ eventType: "remote_access", metadata: { approvedHost: false } });
    expect(unapprovedRemoteAccess(event)).not.toBeNull();
  });

  it("ignores remote access from an approved host", () => {
    const event = buildEvent({ eventType: "remote_access", metadata: { approvedHost: true } });
    expect(unapprovedRemoteAccess(event)).toBeNull();
  });
});

describe("unauthorizedConfigurationChange", () => {
  it("matches configuration changes outside the approved window", () => {
    const event = buildEvent({ eventType: "configuration_change", metadata: { approvedWindow: false } });
    expect(unauthorizedConfigurationChange(event)).not.toBeNull();
  });

  it("ignores configuration changes within the approved window", () => {
    const event = buildEvent({ eventType: "configuration_change", metadata: { approvedWindow: true } });
    expect(unauthorizedConfigurationChange(event)).toBeNull();
  });
});

describe("abnormalPlcCommandSequence", () => {
  it("matches sequences containing an override step", () => {
    const event = buildEvent({
      eventType: "plc_command",
      metadata: { sequence: ["set_mode", "override", "force_apply"] }
    });
    expect(abnormalPlcCommandSequence(event)).not.toBeNull();
  });

  it("ignores sequences without override/force_apply steps", () => {
    const event = buildEvent({ eventType: "plc_command", metadata: { sequence: ["heartbeat_ack"] } });
    expect(abnormalPlcCommandSequence(event)).toBeNull();
  });
});

describe("unauthorizedPrivilegeChange", () => {
  it("matches unapproved privilege changes", () => {
    const event = buildEvent({ eventType: "privilege_change", metadata: { approved: false } });
    expect(unauthorizedPrivilegeChange(event)).not.toBeNull();
  });

  it("ignores approved privilege changes", () => {
    const event = buildEvent({ eventType: "privilege_change", metadata: { approved: true } });
    expect(unauthorizedPrivilegeChange(event)).toBeNull();
  });
});
