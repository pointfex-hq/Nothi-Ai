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
| `retrievedDate` | Date the text was checked against the official source, in `YYYY-MM-DD` |
| `amendment` | Verified amendment, scope, and commencement information |
| `amendmentUrl` | Official link supporting the amendment metadata |
| `splitByClause` | Set to `true` to retain section and subsection openings with numbered clauses. Put each clause marker on a new line. |
| `closingNoteStartsWith` | With clause splitting enabled, the exact line prefix that marks a standalone closing note, if one exists. |
| `retrieveTogether` | With clause splitting enabled, link two to four short subsections so they appear together with separate citations. |

Omit unavailable optional fields. Keep a local corpus under the Git-ignored `backend/data/` directory. Ingestion splits long passages into contiguous excerpts and preserves their original wording. Each Qdrant point stores the excerpt and citation fields in its payload. Ingesting the same file again updates the same points. To replace a corpus without mixing versions, set `QDRANT_LEGAL_COLLECTION` to a new collection name, ingest the replacement, and restart Express.

## Ingest and verify

An administrator can also open `/admin/settings` and upload a JSON or JSON Lines corpus to seed the configured Qdrant collection. The ingestion validates required source metadata and rejects placeholder passage text. The bundled frontend citation catalog is not an approved RAG corpus.

Run from the repository root in PowerShell. Replace the quoted values with a known question and the exact `section` and `lawTitle` values from your corpus.

```powershell
node .\backend\scripts\legal.js collections
node .\backend\scripts\legal.js ingest .\backend\data\legal-corpus.jsonl
node .\backend\scripts\legal.js replace-section .\backend\data\legal-corpus.jsonl "55" "The Transfer of Property Act, 1882"
node .\backend\scripts\legal.js replace-section .\backend\data\legal-corpus.jsonl "17A" "The Registration Act, 1908"
node .\backend\scripts\legal.js search "Your known question" "Expected section" "Expected law title"
```

Use `collections` to confirm the backend can access your cluster. Use `replace-section` after changing an indexed section’s text or layout. It replaces records for the matching act, jurisdiction, section, and source URL. Search considers up to 40 candidates and returns five ranked excerpts at most, plus any linked subsections. When a selected clause spans multiple fragments, search puts those fragments back in order before returning the excerpt. The optional expected section and law title make search exit with an error if the provision is absent from the results. For a bilingual corpus, repeat the search with known Bangla and English questions.

Restart Express after changing `.env` and select **Legal search** next to **Attach** in a signed-in chat. The app sends the question to Qdrant Cloud, then gives the retrieved passages and recent legal turns to OpenRouter. Legal search and attachment Ask share the signed-in account’s question and token limits. Redis reserves the full model input and configured output allowance before calling OpenRouter. The counters survive Express restarts.

If the chat has attachments, OpenRouter also receives their extracted pages. Use the statute citations to check the applicable rule and the filename and page citations to check the facts. Legal search can answer general questions without an attachment. Replacing, editing, or removing an attachment clears turns that used that attachment context.

Section 17A has separate records for subsections (1) and (2). The current presentation period in subsection (2) is 60 days from execution. It applies to presenting the contract for registration. The separate timing rule in Section 54A concerns the instrument of sale. Refreshing the retrieval date or amendment notes leaves point IDs unchanged. [Registration Act Section 17A](https://bdlaws.minlaw.gov.bd/act-90/section-22918.html) · [Registration (Amendment) Act, 2026](https://bdlaws.minlaw.gov.bd/act-print-1643.html) · [Transfer of Property Act Section 54A](https://bdlaws.minlaw.gov.bd/act-48/section-16095.html)

If OpenRouter cannot return a complete cited summary, Legal search shows the retrieved excerpts with their official links.
