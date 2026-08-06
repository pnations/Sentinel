import type { Severity } from "../services/api";

export type ScenarioDefinition = {
  id: string;
  name: string;
  severity: Severity;
  eventType: string;
  description: string;
};

export const scenarios: ScenarioDefinition[] = [
  {
    id: "unauthorized-plc-configuration-change",
    name: "Scenario 1: Unauthorized PLC Configuration Change",
    severity: "critical",
    eventType: "configuration_change",
    description:
      "Unusual remote authentication precedes a critical PLC configuration update outside approved maintenance windows."
  },
  {
    id: "compromised-operator-credentials",
    name: "Scenario 2: Compromised Operator Credentials",
    severity: "high",
    eventType: "authentication",
    description:
      "Repeated failed logins are followed by a successful operator authentication from an unfamiliar source and privilege elevation."
  },
  {
    id: "unexpected-remote-access",
    name: "Scenario 3: Unexpected Remote Access",
    severity: "high",
    eventType: "remote_access",
    description:
      "A previously unseen remote source connects to critical OT assets outside normal operational hours."
  },
  {
    id: "abnormal-plc-communication",
    name: "Scenario 4: Abnormal PLC Communication",
    severity: "medium",
    eventType: "plc_command",
    description:
      "PLC command cadence and destination patterns deviate from baseline profile."
  },
  {
    id: "multi-asset-anomaly",
    name: "Scenario 5: Multi-Asset Anomaly",
    severity: "critical",
    eventType: "system_alert",
    description:
      "Multiple correlated abnormalities appear across authentication, network access, and PLC command behavior."
  }
];
