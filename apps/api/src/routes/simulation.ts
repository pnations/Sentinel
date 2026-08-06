import type { Router } from "express";
import { z } from "zod";
import type { SimulationService } from "../services/simulation/simulationService.js";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

const startNormalBodySchema = z.object({
  intervalMs: z.number().int().min(1000).max(30000).optional()
});

const manualEventBodySchema = z.object({
  scenarioId: z.string().min(1).optional(),
  eventType: z.string().min(1),
  severity: z.string().min(1),
  sourceAssetId: z.string().min(1).optional(),
  destinationAssetId: z.string().min(1).optional(),
  sourceIp: z.string().min(1).optional(),
  destinationIp: z.string().min(1).optional(),
  user: z.string().min(1).optional(),
  description: z.string().min(1),
  metadata: z.record(z.unknown()).optional()
});

export function registerSimulationRoutes(router: Router, simulationService: SimulationService): void {
  router.get("/simulation/status", async (_req, res) => {
    const status = await simulationService.getStatus();
    res.status(200).json(status);
  });

  router.get("/simulation/scenarios", async (_req, res) => {
    try {
      const scenarios = await simulationService.listScenarios();
      res.status(200).json({ items: scenarios });
    } catch (error) {
      res.status(500).json({
        error: "scenario_list_failed",
        message: toErrorMessage(error, "Unable to list scenarios")
      });
    }
  });

  router.post("/simulation/normal/start", async (req, res) => {
    const parsed = startNormalBodySchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", issues: parsed.error.flatten() });
      return;
    }

    try {
      const status = await simulationService.startNormalOperations(parsed.data.intervalMs);
      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({
        error: "normal_start_failed",
        message: toErrorMessage(error, "Unable to start normal operations")
      });
    }
  });

  router.post("/simulation/normal/stop", (_req, res) => {
    const status = simulationService.stopNormalOperations();
    res.status(200).json(status);
  });

  router.post("/simulation/scenarios/:scenarioId/run", async (req, res) => {
    try {
      const result = await simulationService.runScenario(req.params.scenarioId);
      res.status(202).json({ accepted: true, ...result });
    } catch (error) {
      res.status(400).json({
        error: "scenario_run_failed",
        message: toErrorMessage(error, "Unable to run scenario")
      });
    }
  });

  router.post("/simulation/demo-event", async (req, res) => {
    const parsed = manualEventBodySchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res.status(400).json({ error: "invalid_request", issues: parsed.error.flatten() });
      return;
    }

    try {
      const event = await simulationService.emitManualEvent({
        ...parsed.data,
        scenarioId: parsed.data.scenarioId ?? "manual-demo",
        simulated: true,
        metadata: parsed.data.metadata ?? {}
      });

      res.status(202).json({ accepted: true, event });
    } catch (error) {
      res.status(500).json({
        error: "event_injection_failed",
        message: toErrorMessage(error, "Unable to inject simulated event")
      });
    }
  });
}
