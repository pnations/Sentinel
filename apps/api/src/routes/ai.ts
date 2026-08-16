import type { Router } from "express";
import type { InvestigationService } from "../services/ai/investigationService.js";

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function registerAiRoutes(router: Router, investigationService: InvestigationService): void {
  router.post("/incidents/:incidentId/analyze", async (req, res) => {
    try {
      const analysis = await investigationService.analyzeIncident(req.params.incidentId);
      res.status(201).json(analysis);
    } catch (error) {
      const message = toErrorMessage(error, "Unable to analyze incident");
      const notFound = message.startsWith("Incident not found");
      const notConfigured = message === "OPENAI_API_KEY is not configured";

      res.status(notFound ? 404 : notConfigured ? 503 : 500).json({
        error: notFound ? "incident_not_found" : notConfigured ? "ai_not_configured" : "analysis_failed",
        message
      });
    }
  });

  router.get("/incidents/:incidentId/analyses", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit ?? "20"), 10);

    try {
      const items = await investigationService.getRecentAnalyses(req.params.incidentId, limit);
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({
        error: "analyses_fetch_failed",
        message: toErrorMessage(error, "Unable to fetch AI analyses")
      });
    }
  });
}
