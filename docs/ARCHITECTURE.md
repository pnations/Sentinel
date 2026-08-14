# SentinelH20 Architecture (v1)

## Core Pipeline

Telemetry -> Deterministic Detection -> Incident Correlation -> Risk Assessment -> AI Investigation -> Human Review -> Approved Simulated Response -> Audit Log

Deterministic controls are authoritative. AI is advisory.

## Trust Boundaries

- Frontend never receives service secrets.
- OpenAI API key is server-side only.
- Threat-intelligence integrations are backend adapters.
- Simulator is data-only and cannot perform real network or OT control operations.

## Backend Components

- routes: REST and SSE routes
- services/streaming: SSE broker for live updates
- db/schema: normalized PostgreSQL model
- db/migrations: baseline SQL migration
- db/seeds: simulation bootstrap for North River assets/scenarios

## Data Model

Core tables:
- assets
- events
- incidents
- incident_events
- detections
- vulnerabilities
- asset_vulnerabilities
- attack_scenarios
- simulation_runs
- response_actions
- audit_logs
- ai_analyses

## Frontend Components (Phase 1)

- status cards
- scenario selector + simulate attack control
- live event stream viewer

Future pages:
- dashboard
- incidents list/detail
- assets inventory/detail
- topology
- vulnerabilities
