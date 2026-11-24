# Changelog

All notable changes to the **Nothi AI (নথি এআই) v1.2** codebase are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Author:** Fahim Uddin (@udnfahim)  

### Contributor Credits & Branch History
- **`main` / `Frontend` (built by Abed Hossain):** Next.js 16 + TypeScript frontend (`frontend/`).
- **`Iffat` (built by Iffat):** Node.js/Express backend (`backend/`, originally `server/`) and the temporary Vite `client/` (removed during consolidation).
- **Integration & Consolidation (by Fahim Uddin):** Monorepo restructure (`frontend/` + `backend/`), removal of duplicate Vite client and runtime mock data, Next.js `/api` proxy + CORS/CSRF wiring, `.env`-driven Admin/User auth, and documentation.

---

## [1.2.0] - 2026-11-25

### Added
- **Production Startup Orchestrator (`scripts/start.js` & `npm start`)**:
  - Automated production launch script booting both compiled Next.js server (`next start` on `:3000`) and Express server (`node index.js` on `:3001`) with graceful shutdown propagation (`SIGINT`, `SIGTERM`).
- **Ask Mode Multi-Engine Selector (`frontend/src/app/chat/page.tsx`)**:
  - Added segmented controls in the composer toolbar supporting `Legal Search` (Qdrant Cloud + OpenRouter lawyer reasoning + Section 17A), `Document Q&A` (attached Deed/Khatian files), and `Statutory Vetting` (28 codified sections rule engine).
  - Wired live backend message dispatch (`POST /api/chats/:chatId/messages`) when authenticated, with smooth client-side word-by-word streaming animation.
- **Live Upstash Redis Quota Monitor**:
  - Added live quota monitor pill in `/chat` header showing queries remaining today with hover tooltip detailing token budget and daily reset time.
- **Extracted Document Text & OCR Review Modal**:
  - Added background file upload to `/api/chats/:id/document` for PDF.js text and Tesseract OCR extraction.
  - Added "Review Text" modal for inspecting extracted document text with word/character counts and one-click copy.
- **Official BDLaws External Citation Linking (`CitationPopover.tsx`)**:
  - Updated citation chips to resolve official legislation links (`bdlaws.minlaw.gov.bd`) dynamically for retrieved statutory sections.
- **Native SQLite Chat Storage Engine (`backend/chat-store.js`)**:
  - Integrated Node.js 22 native `node:sqlite` database (`chats.sqlite`) with ACID transactions, foreign keys, cascading deletes, and revision conflict detection.
  - Implemented `updateFullChat` supporting live synchronization of chat message streams, titles, attachments, and timestamps.
  - Implemented cascading chat deletion (`deleteUserChats`) and global chat lookup protection (`findChatGlobally`) for administrative controls.
- **Upstash Redis Distributed Quota Architecture (`backend/quota-redis.js`, `backend/ask-quota.js`)**:
  - Integrated Redis client with Lua script atomic evaluation (`checkAndReserve`, `applyReportedUsage`) for distributed rate limiting (per-minute sliding window via sorted sets and daily token/question budgets via hashes).
  - Added resilient in-memory fallback ensuring zero downtime when Redis is unconfigured or unreachable.
- **Enhanced Legal Retrieval & Section 17A Multi-Clause Grouping (`backend/legal-retrieval.js`)**:
  - Added candidate limit expansion (40 candidate points), `splitPassage`, clause grouping, and `assemblePassages` for complex multi-clause statutes such as Section 17A and Section 54/55 of The Transfer of Property Act, 1882.
  - Integrated `intfloat/multilingual-e5-small` embeddings and Qdrant Cloud point querying.
- **Lawyer-Style Legal Reasoning Prompting (`backend/ask.js`)**:
  - Integrated lawyer-style statutory prompt rules, Section 17A support, Bangla linguistic verification, truncated answer detection, and preview generation.
- **Legal Ingest CLI & Evaluation Suite (`backend/scripts/legal.js`, `backend/evals/`)**:
  - Added CLI ingestion and corpus management tool for Qdrant legal corpus ingest, search, collections, and section replacement.
  - Added legal search evaluation suite (`legal-search.json` and `review-legal-search.js`).
- **Permanent, Deterministic User Identifiers**:
  - Stabilized `.env`-seeded accounts (`ADMIN_EMAIL`, `USER_EMAIL`) to use permanent deterministic IDs (`env-admin`, `env-user`) and preserve existing IDs across restarts in `backend/auth.js`.
- **Node.js Watcher Target Isolation**:
  - Configured explicit `--watch-path` targets in `backend/package.json` (including `chat-store.js` and `quota-redis.js`) to prevent process reboots when saving SQLite or session data.

### Fixed
- **VoiceInputButton & Client SSR Hydration Mismatches**:
  - Replaced browser window branch in `VoiceInputButton` with `useSyncExternalStore` (`getSpeechSupportSnapshot` / `getSpeechSupportServerSnapshot`), eliminating server-vs-client markup mismatches during React hydration.
  - Replaced window width branch in `chat/page.tsx` with a responsive resize store subscription (`subscribeWindowResize` / `getIsDesktopSnapshot`), guaranteeing identical initial desktop/mobile hydration markup.
- **Three.js Clock Deprecation Warning**:
  - Filtered Three.js r183 `THREE.Clock: This module has been deprecated` warning emitted internally by `@react-three/fiber` in `RegistryDeskCanvas.tsx`.

---

## [1.1.0] - 2026-11-25

### Added
- **Ask Mode Multi-Engine Selector (`frontend/src/app/chat/page.tsx`)**:
  - Added segmented controls in the composer toolbar supporting `Legal Search` (Qdrant Cloud + OpenRouter lawyer reasoning + Section 17A), `Document Q&A` (attached Deed/Khatian files), and `Statutory Vetting` (28 codified sections rule engine).
  - Wired live backend message dispatch (`POST /api/chats/:chatId/messages`) when authenticated, with smooth client-side word-by-word streaming animation.
- **Live Upstash Redis Quota Monitor**:
  - Added live quota monitor pill in `/chat` header showing queries remaining today with hover tooltip detailing token budget and daily reset time.
- **Extracted Document Text & OCR Review Modal**:
  - Added background file upload to `/api/chats/:id/document` for PDF.js text and Tesseract OCR extraction.
  - Added "Review Text" modal for inspecting extracted document text with word/character counts and one-click copy.
- **Official BDLaws External Citation Linking (`CitationPopover.tsx`)**:
  - Updated citation chips to resolve official legislation links (`bdlaws.minlaw.gov.bd`) dynamically for retrieved statutory sections.
- **Native SQLite Chat Storage Engine (`backend/chat-store.js`)**:
  - Integrated Node.js 22 native `node:sqlite` database (`chats.sqlite`) with ACID transactions, foreign keys, cascading deletes, and revision conflict detection.
  - Implemented `updateFullChat` supporting live synchronization of chat message streams, titles, attachments, and timestamps.
  - Implemented cascading chat deletion (`deleteUserChats`) and global chat lookup protection (`findChatGlobally`) for administrative controls.
- **Upstash Redis Distributed Quota Architecture (`backend/quota-redis.js`, `backend/ask-quota.js`)**:
  - Integrated Redis client with Lua script atomic evaluation (`checkAndReserve`, `applyReportedUsage`) for distributed rate limiting (per-minute sliding window via sorted sets and daily token/question budgets via hashes).
  - Added resilient in-memory fallback ensuring zero downtime when Redis is unconfigured or unreachable.
- **Enhanced Legal Retrieval & Section 17A Multi-Clause Grouping (`backend/legal-retrieval.js`)**:
  - Added candidate limit expansion (40 candidate points), `splitPassage`, clause grouping, and `assemblePassages` for complex multi-clause statutes such as Section 17A and Section 54/55 of The Transfer of Property Act, 1882.
  - Integrated `intfloat/multilingual-e5-small` embeddings and Qdrant Cloud point querying.
- **Lawyer-Style Legal Reasoning Prompting (`backend/ask.js`)**:
  - Integrated lawyer-style statutory prompt rules, Section 17A support, Bangla linguistic verification, truncated answer detection, and preview generation.
- **Legal Ingest CLI & Evaluation Suite (`backend/scripts/legal.js`, `backend/evals/`)**:
  - Added CLI ingestion and corpus management tool for Qdrant legal corpus ingest, search, collections, and section replacement.
  - Added legal search evaluation suite (`legal-search.json` and `review-legal-search.js`).
- **Permanent, Deterministic User Identifiers**:
  - Stabilized `.env`-seeded accounts (`ADMIN_EMAIL`, `USER_EMAIL`) to use permanent deterministic IDs (`env-admin`, `env-user`) and preserve existing IDs across restarts in `backend/auth.js`.
- **Node.js Watcher Target Isolation**:
  - Configured explicit `--watch-path` targets in `backend/package.json` (including `chat-store.js` and `quota-redis.js`) to prevent process reboots when saving SQLite or session data.

### Fixed
- **VoiceInputButton & Client SSR Hydration Mismatches**:
  - Replaced browser window branch in `VoiceInputButton` with `useSyncExternalStore` (`getSpeechSupportSnapshot` / `getSpeechSupportServerSnapshot`), eliminating server-vs-client markup mismatches during React hydration.
  - Replaced window width branch in `chat/page.tsx` with a responsive resize store subscription (`subscribeWindowResize` / `getIsDesktopSnapshot`), guaranteeing identical initial desktop/mobile hydration markup.
- **Three.js Clock Deprecation Warning**:
  - Filtered Three.js r183 `THREE.Clock: This module has been deprecated` warning emitted internally by `@react-three/fiber` in `RegistryDeskCanvas.tsx`.

---

## [1.0.0] - 2026-11-24

### Added
- **Strict Per-User Chat Privacy & Isolation**:
  - Partitioned all chat sessions and document attachments strictly by authenticated owner (`chat.userId === req.user.id`).
  - Enforced zero admin override across `GET /api/chats`, `GET /api/chats/:id`, `POST /api/chats/:id/messages`, and `DELETE /api/chats/:id`.
- **User Lifecycle Management & Instant Session Revocation**:
  - Added user status (`active` | `suspended`), creation timestamp, and environment account protections in `backend/local-data.js` and `backend/auth.js`.
  - Added `PATCH /api/admin/users/:id/status` for toggling account suspension with instant session invalidation in `requireUser`.
  - Added `DELETE /api/admin/users/:id` for permanently deleting user accounts and purging their private chat data.
  - Added `GET /api/admin/audit-logs` tracking chronological administrative actions.
- **Advocate Profile & Security Controls**:
  - Added `PATCH /api/auth/profile` enabling authenticated advocates to update display names and change passwords with `scrypt` verification.
- **Authentication-First Access Control**:
  - Hid all chat entry points (`Header` chat button, `ChatFloatingLauncher`, `ChatDrawer`, and `AskNothiSection` input) for unauthenticated visitors.
  - Added guest sign-in call-to-actions in `Hero3DSection` and `AskNothiSection` connecting directly to `SignInModal`.
  - Added client-side and backend-side route guards on `/chat`, `/audit`, `/dashboard`, and `/admin`.
- **Dedicated User Dashboard (`/dashboard`)**:
  - Built advocate panel displaying live usage quotas, token allowance progress, rate limit rules, recent sessions, and fast-launch cards.
  - Added live quota monitoring via `GET /api/chats/quota`.
- **Dedicated Admin Panel (`/admin`)**:
  - Built administrative control room restricted strictly to `user.role === 'admin'`.
  - Added interactive policy control form to view and update system usage limits live against `backend/usage-limit-settings.js`.
  - Added real-time backend health monitor (`GET /api/health`) and corpus status indicators.
- **Post-Login Routing**:
  - Implemented automatic redirection routing `admin` users to `/admin` and standard `user` accounts to `/dashboard`.
- **Monorepo Two-Stack Architecture**:
  - Restructured the repository into isolated `frontend/` (Next.js 16) and `backend/` (Node.js Express) packages.
  - Added root `package.json` with unified lifecycle scripts (`install:all`, `dev:all`, `dev:frontend`, `dev:backend`, `build`, `lint`, `test`).
  - Added `scripts/dev.js` for color-coded cross-stack development orchestration with graceful `SIGINT`/`SIGTERM` handling.
- **Live Statutory Backend Endpoints**:
  - Added `backend/audit.js` exposing `POST /api/audit/run` and `POST /api/audit/upload` for real deterministic land document bundle auditing (Deed, Khatian, NID).
  - Added `backend/chat-statutory.js` exposing `POST /api/chat` with grounded evaluation of Registration Act 1908, Transfer of Property Act 1882, Land Crime Act 2023, and NID Rules 2010.
- **Environment-Driven RBAC**:
  - Added dynamic `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `USER_EMAIL`, and `USER_PASSWORD` initialization in `backend/auth.js` using `scrypt` hashing and salts.
  - Added `/api/auth/login`, `/api/auth/signin`, `/api/auth/register`, `/api/auth/session`, and `/api/auth/logout` endpoints with `httpOnly`, `SameSite=Lax` cookies.
  - Added strict `admin` role validation on all `/api/admin/*` usage-limit routes, enforcing `403 Forbidden` for non-admin accounts.
- **Executive Documentation**:
  - Added `docs/MERGE_AND_INTEGRATION.md` detailing branch unification (`main`, `Frontend`, `Iffat`), removal of `client/`, and proxy wiring.
  - Added `docs/ARCHITECTURE_AND_STRUCTURE.md` containing Before vs. After diagrams, tech stack breakdown, RBAC flow, and API maps.
  - Added `docs/CHANGELOG.md` tracking unified release history.

### Changed
- **Next.js API Routing**:
  - Updated `frontend/next.config.ts` with internal proxy rewrites (`/api/:path*` ➔ `http://127.0.0.1:3001/api/:path*`) for seamless same-origin cookie transmission.
- **Frontend API Integration**:
  - Refactored `frontend/src/lib/api.ts` to replace mock methods with live queries to `POST /api/audit/run` and `POST /api/audit/upload`.
  - Refactored `frontend/src/lib/chat.ts` to query `POST /api/chat` directly while validating citations through `filterValidCitations()`.
  - Refactored `frontend/src/lib/auth.ts` to manage live session state, cookie-backed login, and role detection.
  - Updated `frontend/src/components/auth/SignInModal.tsx` to handle live authentication, error banners, and role indicators.
  - Updated `frontend/src/app/audit/page.tsx` to load live audit data from `/api/audit/run` on bundle intake.
- **CORS & CSRF Security**:
  - Hardened `backend/index.js` origin checking to permit localhost:3000, 127.0.0.1:3000, same-host requests, and `CLIENT_ORIGIN` / `FRONTEND_URL` / `NEXT_PUBLIC_APP_URL` variables while rejecting untrusted mutating requests with `403 Forbidden`.
  - Configured `trust proxy` in Express and dynamic cookie options (`Secure` & adaptive `SameSite`) for seamless cloud hosting (Vercel, Railway, Render).
  - Configured dynamic server host binding (`0.0.0.0` in production containers, `127.0.0.1` in local dev).
- **Documentation**:
  - Overhauled root `README.md` to reflect the two-stack monorepo structure, local setup instructions, verification commands, and Vercel deployment guidelines.

### Removed
- **Legacy Vite Client (`client/`)**:
  - Completely removed the redundant Vite React template from the repository.
  - Removed dead static file serving `client/dist` from `backend/index.js`.
  - Removed outdated `.gitignore` Vite build rules (`dist-ssr/`).
- **Runtime Mock Files (`frontend/src/mocks/`)**:
  - Deleted `frontend/src/mocks/chat.ts` (simulated client-side chat reasoning).
  - Deleted `frontend/src/mocks/packets.ts` (static hardcoded audit benchmark packets).
  - Cleaned all fallback runtime mock references across frontend code paths.

### Fixed
- **ESLint & TypeScript Errors**:
  - Resolved 53 `@typescript-eslint/no-require-imports` linting errors by scoping frontend ESLint exclusively to `frontend/`.
  - Fixed `@typescript-eslint/no-explicit-any` errors in `SignInModal.tsx` and `chat.ts` using strict TypeScript type guards (`unknown` with `instanceof Error`).
- **Unit Test Isolation**:
  - Refactored `frontend/src/lib/__tests__/chat.test.ts` to test citation filtering and network responses with in-memory `fetch` mocks, achieving 20/20 passing tests.

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

