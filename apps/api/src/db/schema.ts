import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    category: text("category").notNull(),
    ipAddress: text("ip_address").notNull(),
    zone: text("zone").notNull(),
    status: text("status").notNull(),
    criticality: integer("criticality").notNull(),
    version: text("version"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    baselineBehavior: jsonb("baseline_behavior").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("assets_zone_idx").on(table.zone), index("assets_status_idx").on(table.status)]
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull(),
    sourceAssetId: text("source_asset_id").references(() => assets.id),
    destinationAssetId: text("destination_asset_id").references(() => assets.id),
    sourceIp: text("source_ip"),
    destinationIp: text("destination_ip"),
    user: text("user_name"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    simulated: boolean("simulated").notNull().default(true),
    scenarioId: text("scenario_id")
  },
  (table) => [
    index("events_timestamp_idx").on(table.timestamp),
    index("events_type_idx").on(table.eventType),
    index("events_source_asset_idx").on(table.sourceAssetId)
  ]
);

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull().default("open"),
    confidence: real("confidence").notNull(),
    riskScore: integer("risk_score").notNull(),
    riskExplanation: jsonb("risk_explanation").$type<Record<string, unknown>>().notNull().default({}),
    approvalState: text("approval_state").notNull().default("pending"),
    aiSummary: text("ai_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("incidents_status_idx").on(table.status), index("incidents_severity_idx").on(table.severity)]
);

export const incidentEvents = pgTable(
  "incident_events",
  {
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.incidentId, table.eventId] })]
);

export const detections = pgTable(
  "detections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id),
    confidence: real("confidence").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    eventIds: jsonb("event_ids").$type<string[]>().notNull().default([]),
    incidentId: uuid("incident_id").references(() => incidents.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("detections_asset_idx").on(table.assetId), index("detections_severity_idx").on(table.severity)]
);

export const vulnerabilities = pgTable(
  "vulnerabilities",
  {
    id: text("id").primaryKey(),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    cvssScore: real("cvss_score"),
    kevListed: boolean("kev_listed").notNull().default(false),
    vendor: text("vendor"),
    product: text("product"),
    version: text("version"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
  },
  (table) => [index("vulnerabilities_kev_idx").on(table.kevListed), index("vulnerabilities_source_idx").on(table.source)]
);

export const assetVulnerabilities = pgTable(
  "asset_vulnerabilities",
  {
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    vulnerabilityId: text("vulnerability_id")
      .notNull()
      .references(() => vulnerabilities.id, { onDelete: "cascade" }),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.assetId, table.vulnerabilityId] })]
);

export const attackScenarios = pgTable("attack_scenarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const simulationRuns = pgTable(
  "simulation_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scenarioId: text("scenario_id")
      .notNull()
      .references(() => attackScenarios.id),
    status: text("status").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({})
  },
  (table) => [index("simulation_runs_scenario_idx").on(table.scenarioId)]
);

export const responseActions = pgTable(
  "response_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    actionType: text("action_type").notNull(),
    reason: text("reason").notNull(),
    approvalState: text("approval_state").notNull().default("pending"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    executionResult: jsonb("execution_result").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("response_actions_incident_idx").on(table.incidentId)]
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id").references(() => incidents.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    actor: text("actor").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("audit_logs_incident_idx").on(table.incidentId), index("audit_logs_action_idx").on(table.action)]
);

export const aiAnalyses = pgTable(
  "ai_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    model: text("model").notNull(),
    summary: text("summary").notNull(),
    severityAssessment: text("severity_assessment").notNull(),
    confidence: real("confidence").notNull(),
    likelyExplanation: text("likely_explanation").notNull(),
    evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
    affectedAssets: jsonb("affected_assets").$type<string[]>().notNull().default([]),
    recommendedActions: jsonb("recommended_actions").$type<string[]>().notNull().default([]),
    questionsForOperator: jsonb("questions_for_operator").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index("ai_analyses_incident_idx").on(table.incidentId)]
);
