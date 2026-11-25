# Deploy with Dokploy

This repository deploys as two containers using the root `docker-compose.yml`: a public Next.js frontend and a private Express backend. Backend chat/account data persists in the `backend-data` Docker volume.

## Dokploy Setup

1. Create a Compose project in Dokploy and connect this repository and the `nextjs` branch.
2. Set the Compose file path to `docker-compose.yml` and deploy as a Compose application.
3. Add the environment variables below in the Dokploy project before the first deployment.
4. Attach your domain to the `frontend` service on container port `3000` and enable HTTPS. Do not publish the backend service.

Required variables:

| Variable | Example |
| --- | --- |
| `CLIENT_ORIGIN` | `https://nothiai.example.com` |
| `ADMIN_EMAIL` | `admin@example.com` |
| `ADMIN_PASSWORD` | A unique, strong password |

Optional integrations and settings:

| Variable | Purpose |
| --- | --- |
| `OPENROUTER_API_KEY` | Legal Q&A model access |
| `QDRANT_URL` / `QDRANT_API_KEY` | Hosted legal vector search |
| `QDRANT_LEGAL_COLLECTION` | Collection name; defaults to `nothi-legal` |
| `REDIS_URL` | Distributed quota and rate-limit storage |
| `USER_EMAIL` / `USER_PASSWORD` | Optional seeded standard account |
| `NOTHI_ASK_PER_MINUTE` / `NOTHI_ASK_PER_DAY` | Ask request limits |
| `NOTHI_ASK_MAX_OUTPUT_TOKENS` / `NOTHI_ASK_DAILY_TOKEN_BUDGET` | Model usage limits |

`CLIENT_ORIGIN` must exactly match the browser-facing HTTPS origin. The frontend proxies `/api` requests to the backend over the private Compose network, so no public API subdomain is needed. The frontend image is built with `http://backend:3001` as its internal API destination; change the `INTERNAL_API_URL` build argument in the Compose file only if the backend service/network name changes.

Back up the Dokploy Docker volume named for this Compose project’s `backend-data` volume. It contains the SQLite chat database, accounts, usage limits, and audit logs. Recreating containers preserves it; deleting the volume does not.

## Local Container Check

With Docker Compose installed, set the required environment variables in the shell or a local `.env` file, then run:

```sh
docker compose config
docker compose up --build
```

The application listens on port `3000`; the backend listens only on the internal Compose network at port `3001`.
