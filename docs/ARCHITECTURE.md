# SentinelH20 Demo Architecture

## Core Pipeline

Timed Scenario -> Deterministic Detection -> Incident Correlation -> Risk Assessment -> AI Investigation -> Human Review -> Approved Simulated Response

Deterministic controls are authoritative. AI is advisory.

## Trust Boundaries

- The browser owns simulated events, detections, incidents, AI results, reviewer identity, and response decisions in memory only.
- A refresh clears all demo state.
- The frontend never receives service secrets.
- The OpenAI API key is available only to the Netlify Function.
- The simulator is data-only and cannot perform real network or OT control operations.

## Components

- `apps/web/src/lib/scenarios.ts`: scripted event sequences for the five attack simulations
- `apps/web/src/lib/detectionEngine.ts`: deterministic rules, risk scoring, and same-asset incident correlation
- `apps/web/src/hooks/useSentinelDemo.ts`: in-memory UI state and one-active-run scheduler
- `netlify/functions/analyze.ts`: validates bounded incident context and requests schema-constrained AI analysis

## Data Lifecycle

Scenario steps create events in the browser. Events pass through deterministic rules and update correlated incidents. AI investigation sends only the selected incident context to the Netlify Function, then the returned advisory analysis and recommended actions are stored locally. No database, API server, SSE channel, or browser persistence is used.

## Frontend Experience

- status cards
- scenario selector + simulate attack control
- live event stream viewer
- detections and correlated incidents
- AI investigation and in-memory human approval/rejection
