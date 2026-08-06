import type { Router } from "express";
import { randomUUID } from "node:crypto";
import type { SseBroker } from "../services/streaming/sseBroker.js";

export function registerStreamRoutes(router: Router, broker: SseBroker): void {
  router.get("/stream", (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });

    const subscriberId = randomUUID();
    const unsubscribe = broker.subscribe({
      id: subscriberId,
      write: (message: string) => res.write(message),
      close: () => {
        if (!res.writableEnded) {
          res.end();
        }
      }
    });

    res.write(`event: connection\ndata: ${JSON.stringify({
      id: subscriberId,
      connectedAt: new Date().toISOString(),
      activeSubscribers: broker.count()
    })}\n\n`);

    req.on("close", () => {
      unsubscribe();
    });
  });
}
