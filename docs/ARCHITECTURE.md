# SentinelH20 Demo Architecture

## Core Pipeline

Timed Scenario -> Deterministic Detection -> Incident Correlation -> Risk Assessment -> Public-Source Retrieval -> AI Investigation -> Human Review -> Approved Simulated Response

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
- `server/rag/corpus.ts`: curated public references from CISA, EPA, NIST, and MITRE
- `server/rag/retriever.ts`: deterministic lexical retrieval over the checked-in reference corpus
- `netlify/functions/analyze.ts`: validates bounded incident context and requests citation-aware AI analysis

## Data Lifecycle

Scenario steps create events in the browser. Events pass through deterministic rules and update correlated incidents. AI investigation sends the selected incident context to the Netlify Function, which retrieves matching references from the public-source corpus before requesting advisory analysis. The server resolves citation IDs against trusted metadata before returning citations. Results and recommended actions are stored locally. No database, API server, SSE channel, or browser persistence is used.

The initial RAG implementation is intentionally lexical and curated. It proves grounded investigation and citation behavior without adding a second runtime or hosted vector database. The retrieval interface can later be backed by embeddings and `pgvector`.

## Frontend Experience

- status cards
- scenario selector + simulate attack control
- live event stream viewer
- detections and correlated incidents
- AI investigation and in-memory human approval/rejection
