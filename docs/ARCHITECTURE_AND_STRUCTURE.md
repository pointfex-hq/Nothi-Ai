# System Architecture & Directory Structure

**Author:** Fahim Uddin (@udnfahim)  
**System:** Nothi AI (নথি এআই) v1.1 — Statutory Land Document Auditing Platform  
**Architecture:** Decoupled Two-Stack Monorepo (Next.js 16 + Node.js Express)  
**Document Version:** 1.1.0 (Production-Hardened)

---

## Contributor Credits & Branch History

- **`main` / `Frontend` (built by Abed Hossain):** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS, Turbopack) frontend (`frontend/`), interactive 3D registry desk simulation, `/audit` dual-pane workspace, and statutory `/chat` assistant.
- **`Iffat` (built by Iffat):** Node.js/Express backend (`backend/`, originally `server/`) handling OCR (Tesseract + Sharp), PDF text extraction (PDF.js), Qdrant Cloud vector search, statutory limits, and the initial Vite `client/` (removed during consolidation).
- **Integration & Consolidation (by Fahim Uddin):** Monorepo restructure (`frontend/` + `backend/`), removal of duplicate Vite client and runtime mock data, Next.js `/api` proxy + CORS/CSRF wiring, `.env`-driven Admin/User auth, test automation, and documentation.

---

## 1. Architectural Overview

Nothi AI is structured as a production-grade, two-stack monorepo designed for independent scalability, deterministic statutory compliance, and low-friction local development.

```
                          ┌──────────────────────────────────────────────┐
                          │         Web Browser / Client                │
                          │   (Legal Vetting Officers / Advocates)       │
                          └──────────────────────┬───────────────────────┘
                                                 │
                                                 │ Port :3000
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │           Frontend (Next.js 16)              │
                          │  • App Router (React 19, TypeScript)         │
                          │  • 3D Registry Desk (Three.js / R3F)         │
                          │  • Dual-Pane Audit Workspace (/audit)        │
                          │  • Gemini-Style Statutory Assistant (/chat)  │
                          │  • Static Citation Filter (laws_corpus.json) │
                          └──────────────────────┬───────────────────────┘
                                                 │
                                                 │ Internal Proxy Rewrite
                                                 │ /api/* ──► :3001/api/*
                                                 │ (First-Party Cookie Forwarding)
                                                 ▼
                          ┌──────────────────────────────────────────────┐
                          │            Backend (Node.js Express)         │
                          │  • Origin Validation & CORS Firewall         │
                          │  • Cookie Session Auth + scrypt (RBAC)       │
                          │  • Statutory Auditing Engine (audit.js)      │
                          │  • Statutory Analysis Chat (chat-statutory)  │
                          │  • Multi-turn Sessions & Attachments (chats) │
                          │  • OCR Engine (Tesseract + Sharp)            │
                          │  • PDF Extraction (PDF.js)                   │
                          │  • Vector Retrieval (Qdrant Cloud)           │
                          │  • Admin Usage Limits & Quotas               │
                          └──────────────────────────────────────────────┘
```

---

## 2. Before vs. After Directory Structure

The repository underwent a comprehensive restructuring from an unorganized root layout with a legacy Vite client into an isolated, clean two-stack monorepo:

### Comparison

```
BEFORE (Fragmented Layout)                      AFTER (Clean Monorepo)
------------------------------------            ------------------------------------
Nothi-Ai/                                       Nothi-Ai/
├── client/          [DELETED - legacy Vite]    ├── frontend/        [Next.js 16 Stack]
├── src/             [Next.js at root]          │   ├── src/
├── public/                                     │   │   ├── app/      [/, /audit, /chat, /pricing, /dashboard, /admin]
├── server/          [Backend mixed at root]    │   │   ├── components/
│   ├── index.js                                │   │   ├── config/
│   ├── auth.js                                 │   │   ├── context/
│   └── ...                                     │   │   ├── data/     [laws_corpus.json]
├── next.config.ts                              │   │   ├── lib/      [api.ts, chat.ts, auth.ts]
├── tsconfig.json                               │   │   │   └── __tests__/ [vitest tests]
├── vitest.config.ts                            │   │   └── types/
├── eslint.config.mjs                           │   ├── public/
├── package.json     [Next.js mixed package]    │   ├── next.config.ts [Rewrites to :3001]
└── .env.example                                │   ├── tsconfig.json
                                                │   ├── vitest.config.ts
                                                │   ├── eslint.config.mjs
                                                │   ├── package.json
                                                │   └── .env.example
                                                ├── backend/         [Node.js Express Stack]
                                                │   ├── index.js     [Entry, CORS, CSRF]
                                                │   ├── auth.js      [Session cookies, scrypt RBAC]
                                                │   ├── admin.js     [Admin usage limit RBAC]
                                                │   ├── audit.js     [Live bundle audit engine]
                                                │   ├── chat-statutory.js [Statutory chat engine]
                                                │   ├── chats.js     [Session persistence]
                                                │   ├── ask.js       [LLM question answering]
                                                │   ├── ask-quota.js [Token quota tracking]
                                                │   ├── legal-retrieval.js [Qdrant vector search]
                                                │   ├── ocr.js       [Tesseract + Sharp]
                                                │   ├── pdf.js       [PDF.js extraction]
                                                │   ├── local-data.js
                                                │   ├── usage-limit-settings.js
                                                │   ├── package.json
                                                │   └── .env.example
                                                ├── docs/            [Executive Documentation]
                                                │   ├── MERGE_AND_INTEGRATION.md
                                                │   ├── ARCHITECTURE_AND_STRUCTURE.md
                                                │   └── CHANGELOG.md
                                                ├── scripts/
                                                │   └── dev.js       [Monorepo dev orchestrator]
                                                ├── package.json     [Root scripts: dev:all, etc.]
                                                ├── .gitignore       [Monorepo git hygiene]
                                                └── README.md        [Unified project guide]
```

---

## 3. Tech Stack Breakdown

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | `16.0.7` (App Router) | Server-rendered and client-rendered routes, internal `/api` proxying, image optimization |
| **React** | `19.2.0` | React 19 compiler-ready component tree, hooks, and transitions |
| **TypeScript** | `^5` | Strict type safety across client interfaces, DOM models, and API contracts |
| **Tailwind CSS** | `^4` | High-performance CSS token styling, dark/light legal palette |
| **Three.js & R3F** | `^0.181.2` / `^9.0.4` | Interactive 3D registry desk simulation with GLTF model rendering and camera animators |
| **Vitest** | `^3.0.0` | In-memory unit test suite for statutory citations, chat parsing, and markdown rendering |
| **ESLint** | `^9` | Flat config enforcing code quality and strict type checking |

### Backend (`backend/`)
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | `>=22.12.0` | CommonJS server runtime |
| **Express** | `^4.21.2` | REST API routing, cookie parsing, CORS and CSRF protection |
| **Crypto (`node:crypto`)** | Native | `scrypt` password hashing, timing-safe equality checks, session generation |
| **Tesseract.js & Sharp** | `^6.0.0` / `^0.33.5` | Bengali and English OCR text extraction, image preprocessing, thresholding |
| **pdfjs-dist** | `^4.10.38` | Multi-page PDF text extraction and layout inspection |
| **Qdrant Client** | `^1.13.0` | Semantic vector search across Bangladesh statutory corpus |
| **OpenRouter / Gemini** | Cloud API | Multi-turn reasoning with fallback to deterministic statutory engine |

---

## 4. Authentication & Role-Based Access Control (RBAC)

The authentication system is completely environment-driven, requiring zero hardcoded seeds or insecure defaults.

```
       User Submits Login
    (admin / user credentials)
               │
               ▼
   POST /api/auth/login ──────► Verify with scrypt hash in memory/store
               │
               ├─── Password Match?
               │        │
               │        ├── NO  ──► 401 Unauthorized
               │        │
               │        └── YES ──► Issue 'nothi_session' cookie (httpOnly, SameSite=Lax)
               │                    Return user profile { id, email, role: 'admin' | 'user' }
               │
               ▼
   Protected Route Requested
               │
       Check 'nothi_session'
               │
               ├── Invalid/Missing ──► 401 Unauthorized
               │
               ├── Valid User ──► Is Route /api/admin/*?
                                       │
                                       ├── YES & role !== 'admin' ──► 403 Forbidden
                                       │
                                       └── YES & role === 'admin'  ──► 200 OK
                                       └── NO  (regular endpoint)   ──► 200 OK
```

### Environment Configuration (`backend/.env`)
- `ADMIN_EMAIL`: Identifier or username of the administrative account (e.g., `admin`).
- `ADMIN_PASSWORD`: Strong password hashed dynamically on startup via `scrypt`.
- `USER_EMAIL`: Identifier or username of the regular vetting user (e.g., `user`).
- `USER_PASSWORD`: Strong password hashed dynamically on startup via `scrypt`.
- `SESSION_SECRET`: Cryptographic key used to sign and validate session tokens.

### Role Capabilities & Access Matrix

| Persona / Role | Landing & Pricing | Chat (`/chat`) | Audit (`/audit`) | User Dashboard (`/dashboard`) | Admin Panel (`/admin`) | Backend API Quota & Admin |
|---|---|---|---|---|---|---|
| **Guest (Unauthenticated)** | Visible (Chat CTAs hidden; replaced with Sign-In CTA) | Blocked (Sign-In Gate Modal) | Blocked (Sign-In Gate Modal) | Blocked (Sign-In Gate Modal) | Blocked (Sign-In Gate Modal) | `401 Unauthorized` on all functional APIs |
| **User (`role: user`)** | Full Access | Full Access (Grounded Statutory Chat) | Full Access (Dual-Pane Vetting) | Full Access (Live Quota, Chat History, Quick Links) | **Blocked** (Redirects to `/dashboard`) | `403 Forbidden` on `/api/admin/*` |
| **Admin (`role: admin`)** | Full Access | Full Access | Full Access | Full Access | Full Access (Live Health, Limit Forms, Monitor) | `200 OK` (Full CRUD on Usage Limits) |

### Post-Login Redirection Flow
- **`admin` Role**: Successful sign-in immediately routes the administrator to `/admin`.
- **`user` Role**: Successful sign-in or registration immediately routes the advocate to `/dashboard`.
- **Client Route Guards**: Navigating directly to `/chat`, `/audit`, `/dashboard`, or `/admin` when unauthenticated activates an in-place authentication gate modal and prevents unauthenticated API calls. Non-administrative users requesting `/admin` are immediately redirected to `/dashboard`.

---

## 5. Complete API Endpoint Map

All endpoints are hosted by Express on `http://127.0.0.1:3001` and accessible from the browser via Next.js proxy rewrites on `http://localhost:3000/api/*`.

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| **GET** | `/api/health` | Public | System health check, uptime, and corpus status |
| **POST** | `/api/auth/login` | Public | Authenticates user credentials and issues `httpOnly` session cookie |
| **POST** | `/api/auth/signin` | Public | Alias for `/api/auth/login` |
| **POST** | `/api/auth/register` | Public | Registers a new local vetting user |
| **POST** | `/api/auth/logout` | Authenticated | Clears session cookie and invalidates session token |
| **GET** | `/api/auth/session` | Authenticated | Returns current authenticated user and role profile |
| **PATCH** | `/api/auth/profile` | Authenticated | Updates display name and changes password with scrypt verification |
| **POST** | `/api/audit/run` | Authenticated | Runs deterministic land document audit (Deed, Khatian, NID) |
| **POST** | `/api/audit/upload` | Authenticated | Ingests document bundles and returns entity extraction draft |
| **GET** | `/api/chats/quota` | Authenticated | Live daily questions and token budget usage monitor |
| **POST** | `/api/chat` | Authenticated | Direct statutory analysis chat grounded in `laws_corpus.json` |
| **GET** | `/api/chats` | Authenticated | Lists user's private chat sessions (strict owner isolation) |
| **POST** | `/api/chats` | Authenticated | Creates a new private chat session |
| **GET** | `/api/chats/:id` | Authenticated | Retrieves conversation history (enforces owner ID, zero admin bypass) |
| **PUT** | `/api/chats/:id` | Authenticated | Updates/persists title, messages, attachments to `chats.json` |
| **POST** | `/api/chats/:id/messages` | Authenticated | Appends message and generates LLM reply with citations |
| **POST** | `/api/chats/:id/document` | Authenticated | Uploads Deed scan or Khatian PDF to private chat session |
| **DELETE** | `/api/chats/:id` | Authenticated | Deletes private chat session (owner only) |
| **PATCH** | `/api/admin/users/:id/status` | Admin Only | Toggles user status (active/suspended) with instant session revocation |
| **DELETE** | `/api/admin/users/:id` | Admin Only | Permanently deletes account and purges user's private chat history |
| **GET** | `/api/admin/audit-logs` | Admin Only | Retrieves chronological administrative audit logs |
| **POST** | `/api/ask` | Authenticated | Single-turn statutory question answering with vector search |
| **POST** | `/api/ocr` | Authenticated | Ingests image (JPG, PNG) and returns OCR text via Tesseract/Sharp |
| **POST** | `/api/extract` | Authenticated | Ingests PDF document and returns extracted text via PDF.js |
| **GET** | `/api/admin/users` | Admin Only | Fetches sanitized user directory with aggregate chat metrics |
| **PATCH** | `/api/admin/users/:id/status` | Admin Only | Toggles active/suspended account status with instant token revocation |
| **DELETE** | `/api/admin/users/:id` | Admin Only | Permanently deletes user account, revokes sessions, and purges data |
| **GET** | `/api/admin/audit-logs` | Admin Only | Retrieves immutable chronological administrative activity audit trail |
| **GET** | `/api/admin/usage-limits` | Admin Only | Fetches system token usage limits and quota configurations |
| **POST** | `/api/admin/usage-limits` | Admin Only | Updates system token usage limits and per-role quotas |

---

## 6. Development & Production Operations

### Monorepo Orchestration Scripts (`package.json`)
- `npm run install:all`: Concurrently installs dependencies in `frontend/` and `backend/`.
- `npm run dev:all`: Starts both frontend (:3000) and backend (:3001) using `scripts/dev.js` with colorized output and graceful signal propagation.
- `npm run dev:frontend`: Starts Next.js development server with Turbopack.
- `npm run dev:backend`: Starts Express server with Node.js.
- `npm run build`: Executes `next build` inside `frontend/`.
- `npm run lint`: Runs ESLint flat config checks across `frontend/`.
- `npm test`: Runs Vitest across `frontend/` and backend test suites.

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

