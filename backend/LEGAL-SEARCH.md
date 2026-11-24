# Local Legal search

## Configure Qdrant Cloud

1. In the Qdrant Cloud console, copy the cluster’s HTTPS endpoint into `QDRANT_URL` and a database API key with permission to create collections, write points, and query into `QDRANT_API_KEY`. Add both to the private `backend/.env` alongside `OPENROUTER_API_KEY`. [Qdrant Cloud connection and database keys](https://qdrant.tech/documentation/cloud/authentication/)
2. Enable **Inference** for your cluster. Ingestion creates the `nothi-legal` collection when needed, with 384-dimensional cosine vectors. Ingestion and search both use `intfloat/multilingual-e5-small` through Cloud Inference. [Qdrant Cloud Inference](https://qdrant.tech/documentation/cloud/inference/)

## Prepare the corpus

Supply UTF-8 JSON or JSON Lines. Use one object per official passage, with these fields.

| Field | Value |
| --- | --- |
| `passage` | Verbatim text of the section or excerpt |
| `lawTitle` | Official act or law title |
| `section` | Section, article, or rule identifier as it should appear in a citation |
| `jurisdiction` | Jurisdiction that issued the law |
| `officialUrl` | Official HTTP or HTTPS URL, ideally pointing directly to the provision |
| `version` | Official edition or version, if available |
| `effectiveDate` | Effective date, if available. Prefer `YYYY-MM-DD` when known. |

Omit unavailable optional fields. Keep the local corpus under the Git-ignored `backend/data/` directory. Ingestion splits long passages into contiguous excerpts and preserves their original wording. Each Qdrant point stores the excerpt and citation fields in its payload. Ingesting the same file again updates the same points. To replace a corpus without mixing versions, set `QDRANT_LEGAL_COLLECTION` to a new collection name, ingest the replacement, and restart Express.

## Ingest and verify

Run from the repository root in PowerShell. Replace the quoted values with a known question and the exact `section` and `lawTitle` values from your corpus.

```powershell
node .\backend\scripts\legal.js collections
node .\backend\scripts\legal.js ingest .\backend\data\legal-corpus.jsonl
node .\backend\scripts\legal.js search "Your known question" "Expected section" "Expected law title"
```

Use `collections` to confirm the backend can access your cluster. Search prints the returned passages and metadata. It considers up to 20 candidates and returns up to five excerpts, giving other provisions a chance to appear when one section has many matching chunks. The optional expected section and law title make it exit with an error if the provision is absent from the results. For a bilingual corpus, repeat the search with known Bangla and English questions.

Restart Express after changing `.env` and select **Legal search** next to **Attach** in a signed-in chat. The app sends the question to Qdrant Cloud, then gives the retrieved passages and recent legal turns to OpenRouter. Legal search and attachment Ask share the signed-in account’s question and token limits. The app reserves the full model input and configured output allowance before calling OpenRouter. Usage counters reset when Express restarts.

If OpenRouter cannot return a complete cited summary, Legal search shows the retrieved excerpts with their official links.
