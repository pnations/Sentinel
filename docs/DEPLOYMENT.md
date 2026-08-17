# Deployment Guide

## Target Topology

- Frontend: Netlify static site
- AI: Netlify Function at `POST /api/analyze`

## Environment Variables

Netlify Function:
- OPENAI_API_KEY
- OPENAI_MODEL (optional, defaults to `gpt-4.1-mini`)

## Netlify Deployment Steps

1. Connect the repository to a Netlify site.
2. Netlify reads `netlify.toml`, builds the Vite app with `npx pnpm --filter @sentinelh20/web build`, publishes `apps/web/dist`, and bundles `netlify/functions`.
3. Add `OPENAI_API_KEY` in Netlify environment variables. Optionally set `OPENAI_MODEL`.
4. Deploy. The frontend calls the same-origin `/api/analyze` redirect only when a reviewer requests AI investigation.

## Production Hardening Checklist

- Enforce HTTPS.
- Confirm no secret values are present in frontend bundle.
- Rotate API keys regularly.
- Review Netlify Function logs and error rates.
- Remember that demo data is intentionally reset on browser refresh and is never stored server-side.
