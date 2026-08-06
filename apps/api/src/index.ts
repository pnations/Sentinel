import { createApp } from "./app.js";
import { env } from "./config/env.js";

const { app, sseBroker, simulationService } = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[sentinelflow-api] listening on port ${env.PORT}`);
});

const heartbeatInterval = setInterval(() => {
  sseBroker.heartbeat();
}, 20_000);

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`[sentinelflow-api] received ${signal}, shutting down`);
  clearInterval(heartbeatInterval);
  simulationService.stopAll();
  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
