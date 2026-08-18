# Deployment Guide

## Target Topology

- Frontend: Netlify static site
- AI: Netlify Function at `POST /api/analyze`

## Environment Variables

Netlify Function:
- GROQ_API_KEY
- GROQ_MODEL (optional, defaults to `openai/gpt-oss-120b`)

## Netlify Deployment Steps

1. Connect the repository to a Netlify site.
2. Netlify reads `netlify.toml`, builds the Vite app with `npx pnpm --filter @sentinelh20/web build`, publishes `apps/web/dist`, and bundles `netlify/functions`.
3. Add `GROQ_API_KEY` in Netlify environment variables. Optionally set `GROQ_MODEL`.
4. Deploy. The frontend calls the same-origin `/api/analyze` redirect only when a reviewer requests AI investigation.

## Local Development

Run `npx pnpm dev` from the repository root. Vite serves both the frontend and the local `POST /api/analyze` middleware at its printed localhost URL. Create a root `.env` file from `.env.example`, set `GROQ_API_KEY` and optionally `GROQ_MODEL`, and restart Vite after changing either value. Netlify CLI is not needed for local development.

## Production Hardening Checklist

- Enforce HTTPS.
- Confirm no secret values are present in frontend bundle.
- Rotate API keys regularly.
- Review Netlify Function logs and error rates.
- Remember that demo data is intentionally reset on browser refresh and is never stored server-side.
