import type { Router } from "express";

export function registerHealthRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.status(200).json({
      service: "sentinelflow-api",
      status: "ok",
      timestamp: new Date().toISOString()
    });
  });
}
