# Nothi AI (নথি এআই) v1.2

### Deterministic Legal Document Auditing & Statutory Vetting for Bangladesh Property Transfers
**Author:** Fahim Uddin (@udnfahim)  
**Organization:** Pointfex (https://pointfex.com/)  

Nothi AI (নথি এআই) is a deterministic legal document vetting and statutory risk auditing platform engineered specifically for Bangladeshi land and property conveyancing. Built for Legal Vetting Officers, bank credit risk teams, and property advocates, Nothi AI ingests the primary conveyance triad (**Saf Kabala Property Deed**, **Collectorate RS/BS Khatian**, and **National ID Card**), performs multimodal extraction, executes strict statutory parity checks, and enforces a zero-fabrication citation filter grounded in our statutory legal corpus.

---

## Contributor Credits & Branch History

- **`main` / `Frontend` (built by Abed Hossain):** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS, Turbopack) frontend (`frontend/`), interactive 3D registry desk simulation, `/audit` dual-pane workspace, and statutory `/chat` assistant.
- **`Iffat` (built by Iffat):** Node.js/Express backend (`backend/`, originally `server/`) handling OCR (Tesseract + Sharp), PDF text extraction (PDF.js), Qdrant Cloud vector search, statutory limits, and the initial Vite `client/` (removed during consolidation).
- **Integration & Consolidation (by Fahim Uddin):** Monorepo restructure (`frontend/` + `backend/`), removal of duplicate Vite client and runtime mock data, Next.js `/api` proxy + CORS/CSRF wiring, `.env`-driven Admin/User auth, test automation, and documentation.

---

## Developed By — Team Boron

- **MD. Ferdous Hasan Rahid** — Project Manager (PM)
- **Fahim Uddin**
- **Abed Hossain**
- **Tahsinul Hoque Kabbo**
- **Iffat Jahan**

---

## 1. Key Capabilities

- **Dedicated User Dashboard (`/dashboard`)**:
  - Centralized workspace for authenticated legal advocates and vetting officers.
  - Live usage quotas, daily token budgets, rolling rate limits, recent examination sessions with search, and fast-launch actions.
  - Self-service profile settings form allowing advocates to update display names and change passwords with current password verification (`PATCH /api/auth/profile`).

- **Dedicated Admin Control Panel (`/admin`)**:
  - Secure management console restricted strictly to `admin` accounts.
  - **User Lifecycle & Session Revocation**: View configured accounts, toggle active/suspended statuses (`PATCH /api/admin/users/:id/status`) with immediate token invalidation, or delete non-root accounts (`DELETE /api/admin/users/:id`).
  - **Audit Logging Trail**: Real-time event log tracking user status toggles and quota changes (`GET /api/admin/audit-logs`).
  - Live backend health monitoring (`GET /api/health`), dynamic usage-limit reconfiguration (`GET`/`POST`/`PUT` `/api/admin/usage-limits`), and statutory corpus status inspection.

- **Dual-Pane Audit Workspace (`/audit`)**:
  - **Multimodal Document Viewer**: Tabbed viewer for Deed, Khatian, and NID documents with zoom/page controls and synchronized entity highlighting.
  - **Intake & Benchmark Packs**: Automated ingestion for live document bundles as well as verified benchmark packets (**Packet A** Compliant, **Packet B** Planted Defects).
  - **Entity Comparison Matrix**: Cross-document entity comparison table with bilingual Bangla/English text and alignment markers.
  - **Statutory Risk Flags**: Red, Amber, and Green status indicators (`▲ [CRITICAL DEFECT]`, `◆ [STATUTORY WARNING]`, `■ [STATUTORY COMPLIANCE]`) citing verified law sections.
  - **Vetting Memorandum**: Formal legal attestation document with inline statutory citation chips, official verdict stamp, and `@media print` clean export.

- **Dedicated Statutory AI Assistant (`/chat`)**:
  - Full-page conversational interface modeled after Google Gemini web interface with session history and document attachment support.
  - **Ask Mode Multi-Engine Selector**: Seamlessly switch between **Legal Search** (Qdrant Cloud vector search + OpenRouter lawyer-style statutory reasoning + Section 17A clause grouping), **Document Q&A** (targeted queries against attached Deed/Khatian text), and **Statutory Vetting** (codified 28-section statutory rule engine).
  - **Live Distributed Quota Monitor**: Live Upstash Redis quota pill displaying daily questions remaining with detailed token allowance and reset countdown.
  - **Extracted Document Text & OCR Review Modal**: Direct background file upload (`/api/chats/:id/document`) via Tesseract OCR and PDF.js with dedicated word/char-count inspection modal.
  - **Persistent Multi-Turn Sessions Across Server Restarts**: Full multi-turn conversation and attachment history automatically persists via native SQLite (`backend/data/chats.sqlite` via `chat-store.js`) and JSON store (`PUT /api/chats/:chatId`), maintaining persistence across cold server restarts, redeployments, and sign-in sessions with deterministic user IDs (`env-admin`, `env-user`).
  - **Strict Per-User Chat Isolation & Privacy**: Every chat session is scoped strictly to the authenticated user ID (`chat.userId === req.user.id`). Even administrators cannot view, list, or inspect another user's examination sessions or document attachments (`403 Forbidden` on unauthorized access; zero admin backdoor).
  - **SSR Hydration-Safe Architecture**: Voice dictation and responsive sidebar components utilize `useSyncExternalStore` for 100% markup parity between SSR and client hydration.
  - **Zero-Fabrication Citation Filter**: Every citation generated by the assistant is strictly verified against `laws_corpus.json` (28 sections across 4 Acts). Fabricated or hallucinated clauses are stripped before rendering.
  - **Out-of-Corpus Refusal**: Out-of-scope legal queries (tax filings, non-land topics) trigger explicit refusals rather than fabricated advice.
  - **Export & Voice**: Speech-to-text dictation, one-click clipboard copying, and raw text export for legal case dossiers.

- **Interactive 3D Hero & Document Triad Simulation**:
  - Registry-office desk 3D experience built with React Three Fiber, Three.js, and Drei.
  - Four scroll-driven stages: Ingestion (fan out & lift) → Extraction (multimodal scanline) → Cross-audit (field alignment & mismatch detection) → Statutory verdict (physical stamp press).
  - Built-in responsive fallback and `prefers-reduced-motion` compliance.

- **Transparent Three-Tier Pricing (`/pricing`)**:
  - Dedicated `/pricing` route and landing page pricing section with monthly and annual billing (20% discount).
  - Three tiers: **Basic** (pay-as-you-go title verification), **Plus** (high-volume title vetting with audit certificates), and **Pro** (unlimited multi-office banking API).

---

## 2. Monorepo Architecture & Directory Structure

The repository is organized into a clean, decoupled two-stack monorepo:

```
Nothi-Ai/
├── frontend/                         # Next.js 16 App Router (React 19, TypeScript, Tailwind)
│   ├── src/
│   │   ├── app/                      # Routes: /, /audit, /chat, /pricing, /dashboard, /admin
│   │   ├── components/               # React 19 UI components (audit, chat, landing, auth)
│   │   ├── config/                   # Pricing plans & feature configuration
│   │   ├── context/                  # ChatContext state provider
│   │   ├── data/                     # laws_corpus.json (28 statutory sections)
│   │   ├── lib/                      # api.ts, chat.ts, auth.ts, citations.ts, markdown.ts
│   │   │   └── __tests__/            # Vitest unit test suite (citations, chat, markdown)
│   │   └── types/                    # Domain models and backend API contracts
│   ├── public/                       # Static public assets and icons
│   ├── next.config.ts                # Turbopack & Next.js /api proxy rewrites
│   ├── tsconfig.json                 # Strict TypeScript configuration
│   ├── vitest.config.ts              # Vitest test runner configuration
│   ├── eslint.config.mjs             # Flat ESLint configuration
│   ├── package.json                  # Frontend dependencies and scripts
│   └── .env.example                  # Frontend environment variables template
│
├── backend/                          # Node.js Express Backend
│   ├── index.js                      # Express server entry point with CORS & CSRF protection
│   ├── auth.js                       # Session cookies, scrypt hashing, and RBAC authentication
│   ├── admin.js                      # Admin usage limit settings & quota management
│   ├── audit.js                      # Deterministic land document auditing engine
│   ├── chat-statutory.js             # Grounded statutory chat evaluation engine
│   ├── chat-store.js                 # Native SQLite chat store (transactions, cascades, revision)
│   ├── chats.js                      # Multi-turn chat persistence & document extraction
│   ├── ask.js                        # LLM question answering with lawyer-style reasoning
│   ├── ask-quota.js                  # Redis Lua quota tracking & in-memory fallback
│   ├── quota-redis.js                # Upstash Redis client with connection pooling & eval
│   ├── legal-retrieval.js            # Qdrant Cloud vector search & Section 17A clause grouping
│   ├── ocr.js                        # Bengali/English OCR via Tesseract and Sharp
│   ├── pdf.js                        # PDF page extraction via PDF.js
│   ├── local-data.js                 # User accounts & audit logs JSON store helper
│   ├── usage-limit-settings.js       # Admin usage settings management
│   ├── scripts/                      # Legal corpus ingestion CLI (legal.js)
│   ├── evals/                        # Legal search evaluation suite (legal-search.json)
│   ├── package.json                  # Backend dependencies and scripts
│   └── .env.example                  # Backend environment variables template
│
├── docs/                             # Team & Architecture Documentation
│   ├── MERGE_AND_INTEGRATION.md      # Branch merge details, Vite removal, proxy integration
│   ├── ARCHITECTURE_AND_STRUCTURE.md # Before vs After structure, tech stack, RBAC, API map
│   └── CHANGELOG.md                  # Release and architectural changelog
│
├── scripts/
│   ├── dev.js                        # Color-coded monorepo development orchestrator
│   └── start.js                      # Production startup orchestrator (Next.js + Express)
│
├── package.json                      # Root orchestrator scripts (install:all, dev:all, start, etc.)
├── .env.example                      # Root environment variables template
├── .gitignore                        # Monorepo git hygiene
└── README.md                         # Main repository documentation
```

For deeper architectural breakdowns, review:
- [docs/ARCHITECTURE_AND_STRUCTURE.md](file:///home/udnfahim/Desktop/CODE/Nothi-Ai/docs/ARCHITECTURE_AND_STRUCTURE.md)
- [docs/MERGE_AND_INTEGRATION.md](file:///home/udnfahim/Desktop/CODE/Nothi-Ai/docs/MERGE_AND_INTEGRATION.md)
- [docs/CHANGELOG.md](file:///home/udnfahim/Desktop/CODE/Nothi-Ai/docs/CHANGELOG.md)

---

## 3. Local Development Setup

### Prerequisites
- **Node.js**: `>= 22.12.0`
- **npm**: `10+`

### Step 1: Clone & Install Dependencies
Clone the repository and install all dependencies across both `frontend/` and `backend/` using the root orchestrator:

```bash
git clone https://github.com/your-org/Nothi-Ai.git
cd Nothi-Ai

# Installs dependencies concurrently in frontend/ and backend/
npm run install:all
```

### Step 2: Configure Environment Variables

#### Frontend Configuration (`frontend/.env.local`)
Create `frontend/.env.local` by copying `frontend/.env.example`:
```bash
cp frontend/.env.example frontend/.env.local
```
Key variables:
- `NEXT_PUBLIC_APP_URL=http://localhost:3000` (Public frontend origin)
- `INTERNAL_API_URL=http://127.0.0.1:3001` (Internal Next.js proxy rewrite destination)

#### Backend Configuration (`backend/.env`)
Create `backend/.env` by copying `backend/.env.example`:
```bash
cp backend/.env.example backend/.env
```
Key variables:
- `PORT=3001` (Backend server port)
- `SESSION_SECRET=your-random-32-byte-secret` (Cookie session signing key)
- `CLIENT_ORIGIN=http://localhost:3000` (Allowed CORS origin)
- `REDIS_URL="rediss://..."` (Upstash Redis URL for distributed Lua rate limiting and quota tracking)
- `OPENROUTER_API_KEY=sk-or-v1-...` (OpenRouter API key for LLM legal analysis)
- `QDRANT_URL=https://...` (Qdrant Cloud vector search endpoint)
- `QDRANT_API_KEY=...` (Qdrant API key)
- `QDRANT_LEGAL_COLLECTION=nothi-legal-official` (Qdrant statutory collection)

**Configure Admin & Normal User Accounts**:
The authentication system dynamically creates and hashes local development accounts from `.env` on startup:
```ini
# Administrative account (access to /api/admin/* and usage controls)
ADMIN_EMAIL=admin
ADMIN_PASSWORD=AdminPassword123!

# Regular vetting user (access to chat, audit, OCR, PDF)
USER_EMAIL=user
USER_PASSWORD=UserPassword123!
```

### Step 3: Run the Monorepo
Start both the Next.js frontend (`:3000`) and the Node.js backend (`:3001`) simultaneously:

```bash
npm run dev:all
```

Once running:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Direct Backend Health**: [http://127.0.0.1:3001/api/health](http://127.0.0.1:3001/api/health)
- **Proxied Backend Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

You can also run stacks independently:
```bash
npm run dev:frontend   # Starts only Next.js (port 3000)
npm run dev:backend    # Starts only Express (port 3001)
```

#### Production Mode
To launch both production frontend (`next start`) and production backend (`node index.js`) via the production orchestrator:
```bash
npm run build          # Builds production Next.js assets
npm start              # Starts both production frontend & backend
```

---

## 4. Verification & Testing

Execute code quality checks and tests from the root:

```bash
# 1. Run ESLint checks across the frontend
npm run lint

# 2. Run Vitest unit tests (citations, chat, markdown)
npm test

# 3. Compile and build the Next.js production bundle
npm run build
```

---

## 5. Role-Based Access Control (RBAC) & Authentication-First Access

Nothi AI enforces strict server-enforced role separation and authentication-first routing:

### Access Matrix

| Role / Persona | Landing & Pricing | Chat (`/chat`) | Audit (`/audit`) | User Dashboard (`/dashboard`) | Admin Panel (`/admin`) | Functional APIs & Quotas |
|---|---|---|---|---|---|---|
| **Guest (Unauthenticated)** | Visible (Chat options hidden; replaced with Sign-in CTAs) | Blocked (Sign-in Gate) | Blocked (Sign-in Gate) | Blocked (Sign-in Gate) | Blocked (Sign-in Gate) | `401 Unauthorized` |
| **Vetting User (`role: user`)** | Full Access | Full Access | Full Access | Full Access (Quota, History) | **Blocked** (Redirects to `/dashboard`) | Allowed; `403 Forbidden` on `/api/admin/*` |
| **Administrator (`role: admin`)** | Full Access | Full Access | Full Access | Full Access | Full Access (Live Health, Limit Controls) | Full CRUD on Admin APIs (`200 OK`) |

### Post-Login Automatic Routing
- Logging in as **Admin** immediately routes to **`/admin`**.
- Logging in as **User** immediately routes to **`/dashboard`**.

### Testing Accounts from `backend/.env`
Configure working local development credentials in `backend/.env` (gitignored):
```ini
# Administrator account (access to /admin and /api/admin/*)
ADMIN_EMAIL=admin
ADMIN_PASSWORD=AdminPassword123!

# Regular vetting user (access to /dashboard, /chat, /audit)
USER_EMAIL=user
USER_PASSWORD=UserPassword123!
```

---

## 6. Deploying to Vercel

The frontend is a standalone Next.js 16 (App Router) application located in `frontend/`.

> [!IMPORTANT]
> **Vercel Root Directory Configuration**: When importing this repository into Vercel, you **must set the Root Directory to `frontend`**.

1. In the Vercel dashboard, click **Add New Project** and select this repository.
2. In the **Project Settings**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: **Next.js** (auto-detected)
   - **Node.js Version**: **22.x** (in General Settings)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
3. Add Production Environment Variables:
   - `NEXT_PUBLIC_APP_URL`: Your production domain (e.g., `https://nothiai.com`).
   - `INTERNAL_API_URL`: URL of your deployed backend service (e.g., Railway, Render, Cloud Run).

---

## License & Copyright

© 2026 Pointfex (https://pointfex.com/). All Rights Reserved. Developed by Team Boron. See LICENSE for full terms.
