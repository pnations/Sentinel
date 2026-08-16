import { randomUUID } from "node:crypto";
import { pool } from "../../db/client.js";
import { recomputeIncidentApprovalState, type PersistedIncident } from "../detections/detectionService.js";

export type PersistedResponseAction = {
  id: string;
  incidentId: string;
  actionType: string;
  reason: string;
  approvalState: string;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  executionResult: Record<string, unknown>;
  createdAt: string;
};

type ResponseActionRow = {
  id: string;
  incident_id: string;
  action_type: string;
  reason: string;
  approval_state: string;
  approved_by: string | null;
  approved_at: Date | null;
  executed_at: Date | null;
  execution_result: Record<string, unknown>;
  created_at: Date;
};

function mapResponseActionRow(row: ResponseActionRow): PersistedResponseAction {
  return {
    id: row.id,
    incidentId: row.incident_id,
    actionType: row.action_type,
    reason: row.reason,
    approvalState: row.approval_state,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
    executedAt: row.executed_at ? row.executed_at.toISOString() : null,
    executionResult: row.execution_result,
    createdAt: row.created_at.toISOString()
  };
}

export async function createProposedActions(
  incidentId: string,
  reasons: string[]
): Promise<PersistedResponseAction[]> {
  const actions: PersistedResponseAction[] = [];

  for (const reason of reasons) {
    const id = randomUUID();
    const result = await pool.query<ResponseActionRow>(
      `
        INSERT INTO response_actions (id, incident_id, action_type, reason)
        VALUES ($1, $2, 'ai_recommended_action', $3)
        RETURNING id, incident_id, action_type, reason, approval_state, approved_by, approved_at, executed_at, execution_result, created_at
      `,
      [id, incidentId, reason]
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("Response action insert did not return a row");
    }

    actions.push(mapResponseActionRow(row));
  }

  return actions;
}

export async function getResponseActions(incidentId: string): Promise<PersistedResponseAction[]> {
  const result = await pool.query<ResponseActionRow>(
    `
      SELECT id, incident_id, action_type, reason, approval_state, approved_by, approved_at, executed_at, execution_result, created_at
      FROM response_actions
      WHERE incident_id = $1
      ORDER BY created_at ASC
    `,
    [incidentId]
  );

  return result.rows.map(mapResponseActionRow);
}

export async function decideResponseAction(
  id: string,
  decision: "approved" | "rejected",
  approvedBy: string
): Promise<{ action: PersistedResponseAction; incident: PersistedIncident | null }> {
  const result = await pool.query<ResponseActionRow>(
    `
      UPDATE response_actions
      SET approval_state = $1, approved_by = $2, approved_at = now()
      WHERE id = $3 AND approval_state = 'pending'
      RETURNING id, incident_id, action_type, reason, approval_state, approved_by, approved_at, executed_at, execution_result, created_at
    `,
    [decision, approvedBy, id]
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error(`Response action not found or already decided: ${id}`);
  }

  const action = mapResponseActionRow(row);
  const incident = await recomputeIncidentApprovalState(action.incidentId);

  return { action, incident };
}
