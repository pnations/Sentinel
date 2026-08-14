import express from "express";
import cors from "cors";
import type { Express } from "express";
import { env } from "./config/env.js";
import { registerDetectionRoutes } from "./routes/detections.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerSimulationRoutes } from "./routes/simulation.js";
import { registerStreamRoutes } from "./routes/stream.js";
import { SimulationService } from "./services/simulation/simulationService.js";
import { SseBroker } from "./services/streaming/sseBroker.js";

export type AppContext = {
  app: Express;
  sseBroker: SseBroker;
  simulationService: SimulationService;
};

export function createApp(): AppContext {
  const app = express();
  const sseBroker = new SseBroker();
  const simulationService = new SimulationService(sseBroker);

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  const api = express.Router();
  registerHealthRoutes(api);
  registerStreamRoutes(api, sseBroker);
  registerEventRoutes(api);
  registerDetectionRoutes(api);
  registerSimulationRoutes(api, simulationService);

  app.use("/api", api);

  return { app, sseBroker, simulationService };
}
