import { randomUUID } from "node:crypto";
import { pool } from "../../db/client.js";

export type PersistedEvent = {
  id: string;
  timestamp: string;
  eventType: string;
  severity: string;
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

export type CreateEventInput = {
  timestamp?: string;
  eventType: string;
  severity: string;
  sourceAssetId?: string;
  destinationAssetId?: string;
  sourceIp?: string;
  destinationIp?: string;
  user?: string;
  description: string;
  metadata?: Record<string, unknown>;
  simulated?: boolean;
  scenarioId?: string;
};

type EventRow = {
  id: string;
  timestamp: Date;
  event_type: string;
  severity: string;
  source_asset_id: string | null;
  destination_asset_id: string | null;
  source_ip: string | null;
  destination_ip: string | null;
  user_name: string | null;
  description: string;
  metadata: Record<string, unknown>;
  simulated: boolean;
  scenario_id: string | null;
};

function mapRow(row: EventRow): PersistedEvent {
  return {
    id: row.id,
    timestamp: row.timestamp.toISOString(),
    eventType: row.event_type,
    severity: row.severity,
    sourceAssetId: row.source_asset_id,
    destinationAssetId: row.destination_asset_id,
    sourceIp: row.source_ip,
    destinationIp: row.destination_ip,
    user: row.user_name,
    description: row.description,
    metadata: row.metadata,
    simulated: row.simulated,
    scenarioId: row.scenario_id
  };
}

export async function createEvent(input: CreateEventInput): Promise<PersistedEvent> {
  const id = randomUUID();

  const result = await pool.query<EventRow>(
    `
      INSERT INTO events (
        id,
        timestamp,
        event_type,
        severity,
        source_asset_id,
        destination_asset_id,
        source_ip,
        destination_ip,
        user_name,
        description,
        metadata,
        simulated,
        scenario_id
      )
      VALUES (
        $1,
        $2::timestamptz,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11::jsonb,
        $12,
        $13
      )
      RETURNING
        id,
        timestamp,
        event_type,
        severity,
        source_asset_id,
        destination_asset_id,
        source_ip,
        destination_ip,
        user_name,
        description,
        metadata,
        simulated,
        scenario_id
    `,
    [
      id,
      input.timestamp ?? new Date().toISOString(),
      input.eventType,
      input.severity,
      input.sourceAssetId ?? null,
      input.destinationAssetId ?? null,
      input.sourceIp ?? null,
      input.destinationIp ?? null,
      input.user ?? null,
      input.description,
      JSON.stringify(input.metadata ?? {}),
      input.simulated ?? true,
      input.scenarioId ?? null
    ]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Event insert did not return a row");
  }

  return mapRow(row);
}

export async function getRecentEvents(limit = 50): Promise<PersistedEvent[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 200);

  const result = await pool.query<EventRow>(
    `
      SELECT
        id,
        timestamp,
        event_type,
        severity,
        source_asset_id,
        destination_asset_id,
        source_ip,
        destination_ip,
        user_name,
        description,
        metadata,
        simulated,
        scenario_id
      FROM events
      ORDER BY timestamp DESC
      LIMIT $1
    `,
    [safeLimit]
  );

  return result.rows.map(mapRow);
}
