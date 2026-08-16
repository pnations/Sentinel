import type { Router } from "express";
import { z } from "zod";
import {
  decideResponseAction,
  getResponseActions
} from "../services/response/responseActionService.js";
import type { SseBroker } from "../services/streaming/sseBroker.js";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

const decisionBodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  approvedBy: z.string().min(1).max(120)
});

export function registerResponseActionRoutes(router: Router, sseBroker: SseBroker): void {
  router.get("/incidents/:incidentId/response-actions", async (req, res) => {
    try {
      const items = await getResponseActions(req.params.incidentId);
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({
        error: "response_actions_fetch_failed",
        message: toErrorMessage(error, "Unable to fetch response actions")
      });
    }
  });

  router.post("/response-actions/:id/decision", async (req, res) => {
    const parsed = decisionBodySchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", issues: parsed.error.flatten() });
      return;
    }

    try {
      const { action, incident } = await decideResponseAction(
        req.params.id,
        parsed.data.decision,
        parsed.data.approvedBy
      );

      sseBroker.publish({
        id: action.id,
        timestamp: action.approvedAt ?? action.createdAt,
        type: "response.action.updated",
        payload: action
      });

      if (incident) {
        sseBroker.publish({
          id: incident.id,
          timestamp: incident.updatedAt,
          type: "incident.updated",
          payload: incident
        });
      }

      res.status(200).json(action);
    } catch (error) {
      const message = toErrorMessage(error, "Unable to record decision");
      const notFound = message.startsWith("Response action not found");

      res.status(notFound ? 404 : 500).json({
        error: notFound ? "response_action_not_found" : "decision_failed",
        message
      });
    }
  });
}
