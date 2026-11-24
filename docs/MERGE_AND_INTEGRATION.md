# Monorepo Consolidation & Full-Stack Integration Report

**Author:** Fahim Uddin (@udnfahim)  
**System:** Nothi AI (নথি এআই) v1.2 — Statutory Land Document Auditing Platform  
**Target Environment:** Local Development & Production (Next.js 16 + Express Node.js)

---

## 1. Executive Summary

This document details the architectural consolidation, merge resolution, and full-stack integration of `Nothi-Ai`.

Historically, the project evolved across three divergent branches with distinct contributor ownership:
- **`main` / `Frontend` (built by Abed Hossain):** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS, Turbopack) frontend (`frontend/`), including the landing page, interactive 3D hero desk scene, statutory `/chat` interface, and `/audit` dual-pane workspace.
- **`Iffat` (built by Iffat):** Node.js/Express backend (`backend/`, originally `server/`) handling OCR (Tesseract + Sharp), PDF text extraction (PDF.js), Qdrant Cloud vector search, statutory limits, query handling, and the temporary Vite `client/` (removed during consolidation).
- **Integration & Consolidation (by Fahim Uddin):** Monorepo restructure (`frontend/` + `backend/`), removal of duplicate Vite client and runtime mock data, Next.js `/api` proxy + CORS/CSRF wiring, `.env`-driven Admin/User auth, and documentation.

Prior to this pass, the repository suffered from architectural fragmentation: a redundant legacy Vite React app existed in `client/`, Express had dead static references pointing to `../client/dist`, cross-origin requests between the Next.js frontend (`:3000`) and the Node backend (`:3001`) lacked proper CORS headers, CSRF origin checking blocked cross-port requests, and runtime mock files (`src/mocks/`) simulated chat and audit results in the frontend rather than utilizing live backend routes.

This consolidation refactored the entire project into a clean, two-stack monorepo (`frontend/` and `backend/`), removed all runtime mock data, wired live `/api` proxy rewrites, and enforced role-based authentication driven strictly by environment variables.

---

## 2. Removal of the Legacy Vite Client (`client/`)

### Why `client/` Was Removed
- **Redundancy**: The root Next.js 16 application already implemented the complete user experience: bilingual English/Bangla UI, 3D desk simulation via React Three Fiber, Gemini-style chat interface, and legal citation drawer. The Vite template in `client/` was a legacy prototype.
- **Port & Asset Conflicts**: Having both a Vite build system and a Next.js build system caused duplicate dependency conflicts, competing ESLint rules, and confusion regarding deployment targets.

### Cleanups Executed:
- Eliminated dead `clientBuild = path.join(__dirname, '..', 'client', 'dist')` and `app.use(express.static(...))` from `backend/index.js`.
- Cleaned leftover build artifact ignore rules (`dist-ssr/`) from `.gitignore`.
- Established `frontend/` as the single canonical frontend codebase.

---

## 3. Next.js `/api` Proxy Rewrites & CORS/CSRF Configuration

### Next.js Internal Proxy Rewrites
To ensure seamless developer experience without cross-origin friction or third-party cookie restrictions, `frontend/next.config.ts` was configured with Next.js rewrites:

```typescript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: `${process.env.INTERNAL_API_URL || 'http://127.0.0.1:3001'}/api/:path*`,
    },
  ];
}
```

**Benefits**:
- **Same-Origin Requests**: The browser issues requests to `/api/...` directly on `http://localhost:3000`. Next.js forwards them server-to-server to Express at `http://127.0.0.1:3001`.
- **First-Party Cookie Delivery**: Session cookies (`nothi_session`) are treated as first-party with `SameSite=Lax; Path=/`, preventing browser blocking.

### Express CORS & CSRF Protection
In `backend/index.js`, an origin validation layer was implemented:
- Allowed origins include `http://localhost:3000`, `http://127.0.0.1:3000`, the Express host itself, and any custom origins declared in `CLIENT_ORIGIN` or `FRONTEND_URL`.
- Preflight `OPTIONS` requests respond with `204 No Content` and appropriate CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`).
- Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) from unauthorized external origins are rejected with `403 Forbidden` (`{"error":"Open Nothi AI directly to make this request."}`).

---

## 4. Replacement of Runtime Mocks with Live Backend Endpoints

Previously, two runtime mock modules in `frontend/src/mocks/` bypassed the backend:
- `mocks/chat.ts`: Generated simulated statutory chat responses on the client.
- `mocks/packets.ts`: Supplied static Packet A and Packet B benchmark audit matrices and flags.

### Live Endpoints Implemented in `backend/`:
1. **`POST /api/chat` (`backend/chat-statutory.js`)**:
   - Implements the live statutory analysis engine grounded in the 28 verified sections of Bangladeshi property law (`laws_corpus.json`).
   - Evaluates deed presentation timelines under Section 23 of the Registration Act 1908, compulsory registrations under Section 17, schedule plot parity under Section 54 of the Transfer of Property Act 1882, and 10-digit format compliance under Rule 3 of the NID Registration Rules 2010.
   - Refuses out-of-corpus topics (e.g., corporate tax, non-land topics) without hallucinating statutory law.
2. **`POST /api/audit/run` & `POST /api/audit/upload` (`backend/audit.js`)**:
   - Ingests uploaded bundles, classifies files into `deed`, `khatian`, and `nid`, and deterministically checks cross-document entities.
   - Computes real audit flags (`GREEN`, `AMBER`, `RED`), discrepancy counts, and generated vetting memos.

### Frontend API Client Updates:
- Deleted `frontend/src/mocks/` entirely from production code paths.
- Updated `frontend/src/lib/api.ts` so `runAudit()` and `uploadBundle()` call `/api/audit/run` and `/api/audit/upload`.
- Updated `frontend/src/lib/chat.ts` so `sendChatMessage()` dispatches live POST requests to `/api/chat` while preserving the client-side statutory citation filter (`filterValidCitations`).
- Isolated test fixtures into `frontend/src/lib/__tests__/` so Vitest runs deterministically in memory without any runtime mock dependencies.

---

## 5. End-to-End Role-Based Access Control (RBAC)

- Loaded `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `USER_EMAIL`, and `USER_PASSWORD` strictly from `backend/.env` (and documented in `backend/.env.example`).
- At server boot, `backend/auth.js` securely hashes passwords with `scrypt` and salts, assigning roles dynamically.
- `SignInModal.tsx` and `frontend/src/lib/auth.ts` now execute live requests against `POST /api/auth/login` and restore server sessions via `GET /api/auth/session`.
- Verified RBAC:
  - Administrator (identifier: `admin`): Full access to `/api/admin/usage-limits` (HTTP 200).
  - Regular user (identifier: `user`): Blocked from admin routes (HTTP 403 Forbidden) while retaining full access to chat, OCR, extraction, and audit.

---

## 6. Authentication-First Enforcement & Dedicated Role Panels

To ensure strict compliance with institutional legal standards and eliminate unauthorized usage:
1. **Zero-Guest Chat Access**: All chat entry points (`Header` chat CTA, `Hero3DSection` CTA, `ChatFloatingLauncher`, `ChatDrawer`, and `AskNothiSection`) are hidden or replaced with clean Sign-In call-to-actions when logged out.
2. **Client & API Route Guards**: Direct navigation to `/chat`, `/audit`, `/dashboard`, or `/admin` renders an authentication gate modal. Backend endpoints (`/api/audit`, `/api/chat`, `/api/chats`, `/api/ocr`, `/api/extract`, `/api/ask`) enforce `requireUser` returning `401 Unauthorized`.
3. **Dedicated User Dashboard (`/dashboard`)**: Displays live daily question quotas, token budget usage, rolling rate limits, recent examination sessions, and quick-launch links.
4. **Dedicated Admin Panel (`/admin`)**: Restricted exclusively to `admin` role with live health monitoring (`GET /api/health`), interactive usage-limit reconfiguration (`GET`/`POST`/`PUT` `/api/admin/usage-limits`), and corpus status auditing.
5. **Post-Login Routing**: Successful login routes administrators directly to `/admin` and standard vetting users to `/dashboard`.

---

## 7. Strict Per-User Chat Privacy, Lifecycle Controls & Audit Trail

1. **Zero Admin Chat Visibility & Strict Owner Isolation**:
   - Every examination session is strictly tied to `chat.userId === req.user.id`.
   - All chat endpoints (`GET /api/chats`, `GET /api/chats/:id`, `POST /api/chats/:id/messages`, attachment routes, and `DELETE /api/chats/:id`) enforce ownership.
   - Administrators have zero override to inspect or view other users' private sessions or attachments.
2. **User Lifecycle & Instant Session Revocation**:
   - Accounts track `status` (`active` | `suspended`), `createdAt`, and `isEnvAccount`.
   - Admin management endpoints (`GET /api/admin/users`, `PATCH /api/admin/users/:id/status`, `DELETE /api/admin/users/:id`) enable suspension and deletion with safety guards preventing suspension of root environment admins.
   - Suspended accounts have their active sessions instantly revoked.
3. **Advocate Profile Settings**:
   - Authenticated advocates can update display names and change passwords via `PATCH /api/auth/profile` with `scrypt` verification.
4. **Chronological Administrative Audit Trail**:
   - Admin actions (status modifications, deletions, quota adjustments) are logged immutably and accessible via `GET /api/admin/audit-logs`.

---

## 8. Chat Persistence, SQLite Engine & Upstash Redis Integration

1. **Permanent, Deterministic User IDs**:
   - Seeded environment accounts (`ADMIN_EMAIL`, `USER_EMAIL`) utilize immutable IDs (`env-admin`, `env-user`) rather than transient random UUIDs generated on server boot.
   - User registrations preserve their permanent IDs across backend cold restarts and container redeployments.
2. **Native SQLite Chat Storage Engine (`chat-store.js`)**:
   - Replaced legacy file writes with Node.js 22 native `node:sqlite` database (`chats.sqlite`) with ACID transactions, foreign keys, cascading deletes, and revision checks.
   - Enhanced `PUT /api/chats/:chatId` enables client-side streaming synchronization of titles, attachments, and message arrays.
   - Administrative account deletions cascade cleanly across user chats via `deleteUserChats`.
3. **Upstash Redis Distributed Quota Architecture (`quota-redis.js`, `ask-quota.js`)**:
   - Integrated Upstash Redis client with Lua scripts (`checkAndReserve`, `applyReportedUsage`) for distributed rate limiting (sliding window per-minute sorted sets and daily token/question budgets via hashes).
   - In-memory fallback guarantees resilient operation if Redis is temporarily unreachable.
4. **Section 17A Legal Retrieval & Lawyer-Style Reasoning (`legal-retrieval.js`, `ask.js`)**:
   - Expanded retrieval candidate limit to 40 points with multi-clause grouping (`splitPassage`, `clausePoints`, `assemblePassages`) tailored for Section 17A and Section 54/55 of The Transfer of Property Act, 1882.
   - Added legal ingest CLI (`scripts/legal.js`) and search evaluation suite (`evals/`).
5. **Watcher Isolation**:
   - Added explicit `--watch-path` file targets in `backend/package.json` to prevent process reload loops on runtime SQLite database updates.
6. **Hydration Parity**:
   - Speech recognition (`VoiceInputButton`) and responsive layout components subscribe to client stores via `useSyncExternalStore` for 100% markup agreement between SSR and client hydration.
   - Filtered Three.js r183 `THREE.Clock` deprecation notices emitted internally by the React Three Fiber engine.
7. **Frontend Multi-Engine Ask Modes & Document Review**:
   - Introduced segmented mode switcher in `/chat` supporting `Legal Search`, `Document Q&A`, and `Statutory Vetting`.
   - Integrated live Redis daily question and token quota monitor with hover tooltip in header.
   - Built background file extraction for PDF/OCR and added interactive extracted text review modal with word/char counters.
8. **Production Orchestration**:
   - Implemented `scripts/start.js` and `npm start` for concurrent production deployment of Next.js (:3000) and Express (:3001) with clean process signal handling.

---

## Developed By — Team Boron

- **MD. Ferdous Hasan Rahid** — Project Manager (PM)
- **Fahim Uddin**
- **Abed Hossain**
- **Tahsinul Hoque Kabbo**
- **Iffat Jahan**

---

## License & Copyright

© 2026 Pointfex (https://pointfex.com/). All Rights Reserved. Developed by Team Boron. See LICENSE for full terms.

