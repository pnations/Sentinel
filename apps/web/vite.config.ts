import { resolve } from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { InvestigationError, investigate } from "../../server/aiInvestigation.js";

function localAiRoute(environment: Record<string, string | undefined>): Plugin {
  return {
    name: "sentinel-local-ai-route",
    configureServer(server) {
      server.middlewares.use("/api/analyze", async (request, response) => {
        if (request.method !== "POST") {
          response.writeHead(405, { Allow: "POST", "Content-Type": "application/json" });
          response.end(JSON.stringify({ message: "Method not allowed." }));
          return;
        }

        let rawBody = "";
        for await (const chunk of request) rawBody += chunk;

        try {
          const result = await investigate(JSON.parse(rawBody), environment);
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify(result));
        } catch (error) {
          const statusCode = error instanceof InvestigationError ? error.statusCode : 502;
          const message = error instanceof InvestigationError ? error.message : "AI investigation could not be completed.";
          response.writeHead(statusCode, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ message }));
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const repositoryRoot = resolve(__dirname, "../..");
  const environment = loadEnv(mode, repositoryRoot, "");

  return {
    envDir: repositoryRoot,
    plugins: [react(), localAiRoute(environment)]
  };
});
