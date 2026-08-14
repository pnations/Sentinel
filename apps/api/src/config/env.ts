import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgres://postgres:postgres@localhost:5432/sentinelh20"),
  OPENAI_API_KEY: z.string().optional(),
  NVD_API_KEY: z.string().optional(),
  CISA_KEV_URL: z
    .string()
    .url()
    .default("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173")
});

export const env = envSchema.parse(process.env);
