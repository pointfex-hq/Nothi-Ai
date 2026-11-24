# Local Legal search

## Configure Qdrant Cloud

1. In the Qdrant Cloud console, copy the cluster’s HTTPS endpoint into `QDRANT_URL` and a database API key with permission to create collections, write points, and query into `QDRANT_API_KEY`. Add both to the private `server/.env` alongside `OPENROUTER_API_KEY`. [Qdrant Cloud connection and database keys](https://qdrant.tech/documentation/cloud/authentication/)
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
| `splitByClause` | Set to `true` to retain section and subsection openings with numbered clauses. Put each clause marker on a new line. |
| `closingNoteStartsWith` | With clause splitting enabled, the exact line prefix that marks a standalone closing note, if one exists. |

Omit unavailable optional fields. Keep the local corpus under the Git-ignored `server/data/` directory. Ingestion splits long passages into contiguous excerpts and preserves their original wording. Each Qdrant point stores the excerpt and citation fields in its payload. Ingesting the same file again updates the same points. To replace a corpus without mixing versions, set `QDRANT_LEGAL_COLLECTION` to a new collection name, ingest the replacement, and restart Express.

## Ingest and verify

Run from the repository root in PowerShell. Replace the quoted values with a known question and the exact `section` and `lawTitle` values from your corpus.

```powershell
node .\server\scripts\legal.js collections
node .\server\scripts\legal.js ingest .\server\data\legal-corpus.jsonl
node .\server\scripts\legal.js replace-section .\server\data\legal-corpus.jsonl "55" "The Transfer of Property Act, 1882"
node .\server\scripts\legal.js search "Your known question" "Expected section" "Expected law title"
```

Use `collections` to confirm the backend can access your cluster. Use `replace-section` after changing an indexed section’s text or layout. It replaces records for the matching act, jurisdiction, section, and source URL. Search considers up to 40 candidates and returns up to five excerpts, giving other provisions a chance to appear when one section has many matching chunks. When a selected clause spans multiple fragments, search puts those fragments back in order before returning the excerpt. The optional expected section and law title make search exit with an error if the provision is absent from the results. For a bilingual corpus, repeat the search with known Bangla and English questions.

Restart Express after changing `.env` and select **Legal search** next to **Attach** in a signed-in chat. The app sends the question to Qdrant Cloud, then gives the retrieved passages and recent legal turns to OpenRouter. Legal search and attachment Ask share the signed-in account’s question and token limits. Redis reserves the full model input and configured output allowance before calling OpenRouter. The counters survive Express restarts.

If OpenRouter cannot return a complete cited summary, Legal search shows the retrieved excerpts with their official links.
