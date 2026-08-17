# SentinelH20

AI-assisted security monitoring for operational technology.

SentinelH20 v1 is a simulation-only OT security platform centered on a fictional facility, North River Water Utility. It combines deterministic detection, incident correlation, risk scoring, AI-assisted investigation, and human-approved simulated response actions.

## Security Boundary

SentinelH20 v1 is defensive and simulation-only.

It does not scan public networks, exploit vulnerabilities, brute-force authentication, interact with real PLCs, or issue commands to real industrial equipment.

## Stack

- Frontend: React + TypeScript + Vite
- Simulation: browser-memory event, detection, correlation, and response state
- AI: one Netlify Function using the OpenAI Responses API (server-side key only)

## Repository Layout

- apps/web: React frontend
- netlify/functions: server-side AI investigation endpoint
- packages/shared: shared domain types
- docs: architecture and deployment notes

## Prerequisites

- Node.js 20+

## Environment Setup

1. Copy the root environment template for local Netlify development, if using AI investigation.
2. Set the same values in Netlify for deployment.

Files:
- .env.example

Required variables:
- OPENAI_API_KEY

Optional variables:
- OPENAI_MODEL

## Install

Use pnpm via npx (works even if pnpm is not globally installed).

```bash
npx pnpm install
```

## Development

Run the static frontend:

```bash
npx pnpm dev
```

To exercise the Netlify function locally, use Netlify CLI with the server-side environment values from `.env`:

```bash
npx netlify dev
```

All simulated events, detections, incidents, AI results, response approvals, and reviewer names exist only in browser memory. Refreshing the page clears the demo.

## Validation Commands

```bash
npx pnpm typecheck
npx pnpm build
npx pnpm test
```

## Current Phase Status

Implemented foundation items:
- monorepo scaffolding
- frontend demo shell with attack scenario selector and timed live event feed
- deterministic detection engine with incident correlation and risk scoring
- AI-assisted investigation through a server-side Netlify Function (advisory only)
- human approval or rejection of simulated recommended actions

The demo intentionally excludes persistence, authentication, multi-user collaboration, audit logs, real telemetry ingestion, and real-world response execution.

## Deployment Notes

See docs/DEPLOYMENT.md for Netlify deployment guidance.
