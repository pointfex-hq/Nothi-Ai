# Deploy with Dokploy

The root `Dockerfile` is configured for Dokploy's default Dockerfile deployment. It builds Next.js and the Express backend into one container, serves the app on port `3000`, and keeps the backend on the private container loopback. No Compose configuration is required.

## Dokploy Setup

1. Create a Dockerfile application in Dokploy and connect this repository and the `nextjs` branch.
2. Keep the default Dockerfile path (`Dockerfile`) and deploy. Dokploy should detect container port `3000`.
3. Attach your domain to port `3000` and enable HTTPS.

No environment variables are required for the app to start. Users can register normally; set the following only if you want an environment-seeded administrator:

| Variable | Example |
| --- | --- |
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

The Next.js frontend proxies `/api` requests to the backend inside the same container. Same-origin requests are checked against the forwarded host; if your reverse proxy does not forward `X-Forwarded-Host`, set `CLIENT_ORIGIN` to the exact public HTTPS origin.

The image declares `/app/backend/data` as a Docker volume for SQLite chats, accounts, usage limits, and audit logs. For durable backups across container replacement, configure persistent storage in Dokploy. Alternatively, use the root `docker-compose.yml`, which defines a named `backend-data` volume and separate frontend/backend containers.

## Local Container Check

To run the default single-container image locally:

```sh
docker build -t nothi-ai .
docker run --rm -p 3000:3000 -v nothi-data:/app/backend/data nothi-ai
```

The application listens on port `3000`; the backend listens only on `127.0.0.1:3001` inside the container.
