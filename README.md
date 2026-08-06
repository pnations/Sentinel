# SentinelFlow

AI-assisted security monitoring for operational technology.

SentinelFlow v1 is a simulation-only OT security platform centered on a fictional facility, North River Water Utility. It combines deterministic detection, incident correlation, risk scoring, AI-assisted investigation, and human-approved simulated response actions.

## Security Boundary

SentinelFlow v1 is defensive and simulation-only.

It does not scan public networks, exploit vulnerabilities, brute-force authentication, interact with real PLCs, or issue commands to real industrial equipment.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + TypeScript + Express
- Database: PostgreSQL + Drizzle schema/migrations
- Live updates: Server-Sent Events (SSE)
- AI: OpenAI Responses API (server-side key only)

## Repository Layout

- apps/web: React frontend
- apps/api: Express backend
- packages/shared: shared domain types
- docs: architecture and deployment notes

## Prerequisites

- Node.js 20+
- PostgreSQL 14+

## Environment Setup

1. Copy root env template.
2. Copy backend and frontend env templates.
3. Fill secret values locally.

Files:
- .env.example
- apps/api/.env.example
- apps/web/.env.example

Required variables:
- DATABASE_URL
- OPENAI_API_KEY
- NVD_API_KEY
- CISA_KEV_URL
- FRONTEND_URL
- PORT
- VITE_API_URL

## Install

Use pnpm via npx (works even if pnpm is not globally installed).

```bash
npx pnpm install
```

## Database Initialization

Apply baseline migration and seed North River data.

```bash
npx pnpm --filter @sentinelflow/api db:seed
```

This creates required core tables and seeds:
- OT/IT assets
- attack scenarios

## Development

Run backend and frontend concurrently:

```bash
npx pnpm dev
```

Run one service:

```bash
npx pnpm dev:api
npx pnpm dev:web
```

## Validation Commands

```bash
npx pnpm -r typecheck
npx pnpm -r build
npx pnpm -r test
```

## Current Phase Status

Implemented foundation items:
- monorepo scaffolding
- backend API skeleton
- SSE event stream
- simulation demo event endpoint
- shared domain types
- PostgreSQL schema and migration baseline
- North River bootstrap seed
- frontend Phase 1 shell with attack scenario selector and live event feed

Next implementation targets:
- normal operations telemetry generator
- deterministic detection engine
- incident correlation and risk scoring

## Deployment Notes

See docs/DEPLOYMENT.md for Netlify + Node host + managed PostgreSQL guidance.
