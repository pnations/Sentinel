import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../client.js";

const assets = [
  ["PLC-01", "PLC-01 - Intake Control", "plc", "ot", "10.40.10.11", "field", "healthy", 95, "FW-3.4.1"],
  ["PLC-02", "PLC-02 - Pump Station", "plc", "ot", "10.40.10.12", "field", "healthy", 94, "FW-3.4.1"],
  ["PLC-03", "PLC-03 - Chemical Treatment", "plc", "ot", "10.40.10.13", "field", "healthy", 98, "FW-3.4.3"],
  ["PLC-04", "PLC-04 - Filtration", "plc", "ot", "10.40.10.14", "field", "healthy", 92, "FW-3.4.1"],
  ["PLC-05", "PLC-05 - Distribution", "plc", "ot", "10.40.10.15", "field", "healthy", 93, "FW-3.4.1"],
  ["HMI-01", "HMI-01 - Main Operator HMI", "hmi", "ot", "10.40.20.11", "ot", "healthy", 90, "HMI-2.6.4"],
  ["HMI-02", "HMI-02 - Secondary Operator HMI", "hmi", "ot", "10.40.20.12", "ot", "healthy", 85, "HMI-2.6.4"],
  ["RTU-01", "RTU-01 - Remote Telemetry Unit", "rtu", "ot", "10.40.30.11", "field", "healthy", 86, "RTU-1.9.0"],
  ["SENSOR-01", "SENSOR-01 - Tank Level Sensor", "sensor", "ot", "10.40.31.11", "field", "healthy", 80, "SEN-5.2"],
  ["SENSOR-02", "SENSOR-02 - Flow Sensor", "sensor", "ot", "10.40.31.12", "field", "healthy", 79, "SEN-5.2"],
  ["SENSOR-03", "SENSOR-03 - Pressure Sensor", "sensor", "ot", "10.40.31.13", "field", "healthy", 81, "SEN-5.2"],
  ["ENG-01", "ENG-01 - Engineering Workstation", "workstation", "it", "10.10.10.21", "engineering", "healthy", 88, "Win11-23H2"],
  ["OPS-01", "OPS-01 - Operations Workstation", "workstation", "it", "10.40.20.21", "ot", "healthy", 87, "Win11-23H2"],
  ["SCADA-01", "SCADA-01 - SCADA Server", "server", "it", "10.40.20.31", "ot", "healthy", 97, "SCADA-7.11"],
  ["AUTH-01", "AUTH-01 - Authentication Server", "server", "it", "10.10.10.31", "corporate", "healthy", 89, "AD-2019"],
  ["FW-01", "FW-01 - Network Firewall", "firewall", "it", "10.10.0.1", "perimeter", "healthy", 96, "FW-9.4.2"]
] as const;

const scenarios = [
  [
    "unauthorized-plc-configuration-change",
    "Scenario 1 - Unauthorized PLC Configuration Change",
    "Unusual authentication, remote connection, unauthorized configuration update, and resulting process anomaly.",
    "critical"
  ],
  [
    "compromised-operator-credentials",
    "Scenario 2 - Compromised Operator Credentials",
    "Repeated authentication failures followed by unusual successful operator login and privilege escalation.",
    "high"
  ],
  [
    "unexpected-remote-access",
    "Scenario 3 - Unexpected Remote Access",
    "Unrecognized remote source communication to critical OT asset outside normal hours.",
    "high"
  ],
  [
    "abnormal-plc-communication",
    "Scenario 4 - Abnormal PLC Communication",
    "PLC communication frequency and command sequence deviates from baseline.",
    "medium"
  ],
  [
    "multi-asset-anomaly",
    "Scenario 5 - Multi-Asset Anomaly",
    "Correlated abnormalities across authentication, network, configuration, and process behavior.",
    "critical"
  ]
] as const;

async function run() {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const migrationPath = resolve(rootDir, "db/migrations/0001_initial.sql");
  const sql = await readFile(migrationPath, "utf8");

  await pool.query(sql);

  for (const asset of assets) {
    await pool.query(
      `
      INSERT INTO assets (
        id, name, type, category, ip_address, zone, status, criticality, version, last_seen_at, baseline_behavior
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), $10::jsonb)
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            type = EXCLUDED.type,
            category = EXCLUDED.category,
            ip_address = EXCLUDED.ip_address,
            zone = EXCLUDED.zone,
            status = EXCLUDED.status,
            criticality = EXCLUDED.criticality,
            version = EXCLUDED.version,
            last_seen_at = now(),
            updated_at = now();
      `,
      [
        asset[0],
        asset[1],
        asset[2],
        asset[3],
        asset[4],
        asset[5],
        asset[6],
        asset[7],
        asset[8],
        JSON.stringify([
          "approved_hmi_plc_traffic",
          "scada_polling_every_5s",
          "operator_authentication_during_shift"
        ])
      ]
    );
  }

  for (const scenario of scenarios) {
    await pool.query(
      `
      INSERT INTO attack_scenarios (id, name, description, severity)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            severity = EXCLUDED.severity;
      `,
          [...scenario]
    );
  }

  console.log(`[sentinelflow-api] bootstrap complete: ${assets.length} assets, ${scenarios.length} scenarios`);
}

run()
  .catch((error) => {
    console.error("[sentinelflow-api] bootstrap failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
