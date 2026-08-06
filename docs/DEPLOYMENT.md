# Deployment Guide (v1)

## Target Topology

- Frontend: Netlify (or equivalent static host)
- Backend: Node host (Render/Fly.io/Railway or equivalent)
- Database: managed PostgreSQL

## Environment Variables

Backend:
- DATABASE_URL
- OPENAI_API_KEY
- NVD_API_KEY
- CISA_KEV_URL
- FRONTEND_URL
- PORT

Frontend:
- VITE_API_URL

## Backend Deployment Steps

1. Build backend:
   - npx pnpm --filter @sentinelflow/api build
2. Run migration/seed during first deploy or release step:
   - npx pnpm --filter @sentinelflow/api db:seed
3. Start service:
   - npx pnpm --filter @sentinelflow/api start
4. Restrict CORS to frontend origin using FRONTEND_URL.

## Frontend Deployment Steps

1. Build frontend:
   - npx pnpm --filter @sentinelflow/web build
2. Publish apps/web/dist.
3. Set VITE_API_URL to deployed backend URL.

## Production Hardening Checklist

- Enforce HTTPS.
- Confirm no secret values are present in frontend bundle.
- Restrict backend CORS origin.
- Rotate API keys regularly.
- Enable database backups.
- Monitor backend logs and error rates.
