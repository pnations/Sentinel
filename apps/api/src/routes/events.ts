import type { Router } from "express";
import { getRecentEvents } from "../services/events/eventService.js";

export function registerEventRoutes(router: Router): void {
  router.get("/events/recent", async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit ?? "50"), 10);

    try {
      const events = await getRecentEvents(limit);
      res.status(200).json({ items: events });
    } catch (error) {
      res.status(500).json({
        error: "events_fetch_failed",
        message: error instanceof Error ? error.message : "Unable to fetch recent events"
      });
    }
  });
}
