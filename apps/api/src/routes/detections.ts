import type { Router } from "express";
import { getRecentDetections, getRecentIncidents } from "../services/detections/detectionService.js";

export function registerDetectionRoutes(router: Router): void {
  router.get("/detections/recent", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit ?? "50"), 10);

    try {
      const items = await getRecentDetections(limit);
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({
        error: "detections_fetch_failed",
        message: error instanceof Error ? error.message : "Unable to fetch recent detections"
      });
    }
  });

  router.get("/incidents/recent", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit ?? "50"), 10);

    try {
      const items = await getRecentIncidents(limit);
      res.status(200).json({ items });
    } catch (error) {
      res.status(500).json({
        error: "incidents_fetch_failed",
        message: error instanceof Error ? error.message : "Unable to fetch recent incidents"
      });
    }
  });
}
