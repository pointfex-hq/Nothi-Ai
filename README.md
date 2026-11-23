# Nothi AI (নথি এআই) v1.0
### Legal Document Auditing & Statutory Vetting System for Bangladesh Property Transfers
**By Team Boron at Pointfex**

Nothi AI (নথি এআই) is a deterministic legal document vetting and statutory risk auditing platform engineered specifically for Bangladeshi land and property transactions. Built for Legal Vetting Officers, bank credit risk teams, and property advocates, Nothi AI ingests the primary conveyance triad (**Saf Kabala Property Deed**, **Collectorate RS/BS Khatian**, and **National ID Card**), performs multimodal extraction, executes strict statutory parity checks, and enforces a zero-fabrication citation filter backed by our statutory corpus.

---

## 1. Key Capabilities & Architecture

- **Interactive 3D Hero & Document Triad Simulation**:
  - Registry-office desk 3D experience built with React Three Fiber, Three.js, and Drei.
  - Scroll-driven simulation across 4 stages: Ingestion (fan out & lift) → Extraction (multimodal scanline) → Cross-audit (field alignment & mismatch detection) → Statutory verdict (physical stamp press).
  - Graceful degradation on mobile (<768px) and strict `prefers-reduced-motion` compliance.

- **Dedicated Gemini-Style AI Assistant (`/chat`)**:
  - Full-page dedicated chat experience modeled after Google Gemini web interface.
  - **Collapsible Sidebar**: New chat button, recent conversation session history (persisted in `localStorage`), switch/delete conversations, statutory corpus status.
  - **Document & Image Sharing**: Users can drag and drop or attach deed scans (JPG, PNG) and Khatian ledgers (PDF). Renders thumbnail previews with click-to-enlarge lightbox modal.
  - **Deterministic Statutory Grounding (SRS FR-4.2, NFR-1)**: Every response from the assistant is filtered through `filterValidCitations()`. Only citations existing in `laws_corpus.json` (28 sections across 4 Acts) can render as interactive chips; unverified or fabricated citations are stripped.
  - **Out-of-Corpus Refusal**: When queried about unverified topics (tax clearances, non-land topics), the assistant explicitly refuses rather than hallucinating statutory law.
  - **Export & Voice**: Speech dictation support, copy-to-clipboard with visual feedback, and text export for legal case files.

- **3D Statutory Citation Gate**:
  - CSS 3D transformed registry checkpoint demonstrating live filtering of 4 sample citations (`reg_1908_sec23`, `tp_1882_sec52`, `land_crime_2023_sec4`, and fabricated `reg_1908_sec999_fake_clause`).
  - Interactive card catalog drawers opening verbatim statutory text in the inspection modal.

- **Transparent Three-Tier Pricing**:
  - Dedicated `/pricing` route and landing page pricing section with monthly/yearly billing (20% discount).
  - 3 Tiers: **Basic** (pay-as-you-go title verification), **Plus** (high-volume title vetting with audit certificates), and **Pro** (unlimited multi-office banking API).
  - 6-item accessible FAQ accordion and contact request modals.

- **`/audit` Dual-Pane Workspace**:
  - **Left Pane**: Multimodal document viewer with document switcher tabs (Deed, Khatian, NID), zoom/page controls, and live synchronized bounding-box highlighting.
  - **Right Pane**:
    1. **Intake Section**: File drag-and-drop zone with pre-loaded benchmark loaders for **Packet A (Compliant)** and **Packet B (3 Planted Defects)**.
    2. **Entity Comparison Matrix**: Cross-document entity comparison table with bilingual Bangla/English text.
    3. **Risk Flags**: Red / Amber / Green statutory flags with shape badges (`▲ [CRITICAL DEFECT]`, `◆ [STATUTORY WARNING]`, `■ [STATUTORY COMPLIANCE]`).
    4. **Citation Inspector**: Drawer with verbatim statutory text from `laws_corpus.json`.
    5. **Vetting Memorandum**: Official attestation document with inline statutory citation chips, verdict seal, and `@media print` stylesheet.

---

## 2. Quick Start

### Prerequisites
- Node.js >= 22.12.0 (configured in `package.json` engines)
- npm 10+

### Installation & Verification
```bash
# Install dependencies
npm install

# Run linter
npm run lint

# TypeScript verification
npx tsc --noEmit

# Run unit tests (Vitest)
npm test

# Build for production (Next.js Turbopack)
npm run build

# Start production server
npm start
```
The application runs locally at `http://localhost:3000`.

---

## 3. Deploying to Vercel

Nothi AI is a **Next.js 16 (App Router) + React 19** application with strict TypeScript. To deploy to Vercel:

1. **Framework Preset**: Select **Next.js** (auto-detected).
2. **Node.js Version**: In Vercel Project Settings → General → Node.js Version, select **22.x** (compatible with `"engines": { "node": ">=22.12.0" }`).
3. **Build Command**: `npm run build` (or `next build`).
4. **Output Directory**: `.next` (Next.js default, do not override).
5. **Install Command**: `npm install` (standard strict peer dependency resolution).
6. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL` (optional, defaults to mock API client if omitted). Refer to `.env.example`.

---

## 4. Connecting the Backend APIs

### A. Document Auditing (`src/lib/api.ts`)
The audit workspace interacts with the backend through `src/lib/api.ts`. To connect to a live FastAPI backend:
1. Set `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` in `.env.local`.
2. Update `runAudit()` in `src/lib/api.ts` to `POST` files as `FormData` to `/audit/run`.

### B. Citation-Locked Chat (`src/lib/chat.ts`)
The AI Chat client is abstracted in `src/lib/chat.ts`. To connect to a live streaming FastAPI endpoint:
1. Replace `mockChatStream` in `src/lib/chat.ts` with a `fetch` call to `POST /api/chat`:
   ```typescript
   export async function sendChatMessage(
     messages: { role: string; content: string }[],
     onToken: (token: string) => void,
     signal?: AbortSignal
   ): Promise<ChatStreamResponse> {
     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ messages }),
       signal,
     });

     const reader = response.body?.getReader();
     const decoder = new TextDecoder();
     let fullText = '';
     let citations: string[] = [];

     while (reader) {
       const { done, value } = await reader.read();
       if (done) break;
       const chunk = decoder.decode(value);
       // Parse SSE or streaming tokens and invoke onToken(token)
     }

     return {
       fullText,
       // Strictly filter citations against laws_corpus.json
       validCitations: filterValidCitations(citations),
       allCitations: citations,
     };
   }
   ```

---

## 5. File Manifest

```
LawLens/
├── src/
│   ├── app/
│   │   ├── audit/
│   │   │   └── page.tsx              # Audit workspace page (split screen)
│   │   ├── pricing/
│   │   │   └── page.tsx              # Dedicated /pricing route
│   │   ├── globals.css               # Design tokens, registry palette, print rules
│   │   ├── layout.tsx                # Root layout with ChatProvider & launcher
│   │   └── page.tsx                  # Landing page (hero, chat doorway, roadmap, pricing)
│   ├── components/
│   │   ├── Header.tsx                # Global navigation & EN/BN switcher
│   │   ├── Footer.tsx                # Official footer & credit (Nothi AI v1.0)
│   │   ├── Logo.tsx                  # Bespoke dossier folder + lens SVG logo
│   │   ├── chat/
│   │   │   ├── AskNothiSection.tsx   # Entry point B: landing page chat doorway
│   │   │   ├── ChatDrawer.tsx        # Right-side drawer / mobile sheet with streaming
│   │   │   └── ChatFloatingLauncher.tsx # Entry point A: 56px bottom-right button
│   │   ├── pricing/
│   │   │   ├── ContactModal.tsx      # Request Access & Demo contact modal
│   │   │   └── PricingSection.tsx    # 3-tier pricing cards, comparison table, FAQ
│   │   ├── audit/
│   │   │   ├── CitationChip.tsx      # Citation badge with integrity validation
│   │   │   ├── CitationDrawer.tsx    # Statutory section inspector side-drawer
│   │   │   ├── DocumentViewer.tsx    # Left-pane viewer with active bounding boxes
│   │   │   ├── EntityMatrix.tsx      # Cross-document comparison table
│   │   │   ├── IntakeSection.tsx     # File upload & benchmark packet loaders
│   │   │   ├── PipelineProgressTracker.tsx # 5-stage progress indicator (<18s)
│   │   │   ├── RiskFlags.tsx         # Red/Amber/Green flags with shapes & text
│   │   │   └── VettingMemo.tsx       # Printable official vetting memorandum
│   │   └── landing/
│   │       ├── AudienceSection.tsx   # Who it's for (Advocates, Banks, Developers)
│   │       ├── FinalCtaSection.tsx   # Pre-footer conversion call to action
│   │       ├── FiveStagesFlow.tsx    # 5-stage serpentine roadmap
│   │       ├── Hero3DSection.tsx     # Pinned 3D registry desk hero container
│   │       └── citation-gate/        # CSS 3D citation checkpoint & modal
│   ├── config/
│   │   └── plans.ts                  # Pricing tier matrix & TODO price markers
│   ├── context/
│   │   └── ChatContext.tsx           # Shared chat state across entry points
│   ├── data/
│   │   └── laws_corpus.json          # 28 statutory sections (verified Sec. 23 + placeholders)
│   ├── lib/
│   │   ├── __tests__/
│   │   │   ├── citations.test.ts     # Vitest unit test for NFR-1 citation filter
│   │   │   └── chat.test.ts          # Vitest unit tests for chat grounding & refusal
│   │   ├── api.ts                    # Single API client interface
│   │   ├── chat.ts                   # Chat client interface & citation lock
│   │   ├── citations.ts              # Citation verification & corpus lookups
│   │   ├── contact.ts                # Contact & demo request client
│   │   └── lang.tsx                  # EN/BN bilingual context & dictionary
│   ├── mocks/
│   │   ├── chat.ts                   # Deterministic chat reasoning engine
│   │   └── packets.ts                # Benchmark Packet A & Packet B data
│   └── types/
│       └── index.ts                  # TypeScript definitions (AuditResult, Flag, etc.)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 6. Placeholders to Replace with Real Data

Before official commercial deployment, replace the following placeholders:

| Item | File Location | Description |
|---|---|---|
| **Subscription Prices** | `src/config/plans.ts` | Basic, Plus, and Pro tiers currently contain `"TODO: set real price"`. Replace with approved BDT subscription rates. |
| **27 Statutory Sections** | `src/data/laws_corpus.json` | Section 23 of Registration Act 1908 is verified. The other 27 sections (Registration Act 17, 24, 25, 28, 32, 47, 49, 52; TPA 3, 6, 7, 10, 17, 52, 54, 55; LCPRA 3, 4, 5, 6, 7, 8, 9; NIDW Rules 3, 4, 5, 6) have clearly marked text: `PLACEHOLDER: replace with verified text from laws_corpus.json (28 sections)`. Replace with verified statutory text from the legal gazette. |
| **Document Bounding Boxes** | `src/types/index.ts` & `src/components/audit/DocumentViewer.tsx` | Replace representative mock coordinates with normalized bounding boxes `[ymin, xmin, ymax, xmax]` provided by the backend multimodal extraction model. |
| **Document Scans** | `src/components/audit/DocumentViewer.tsx` | Replace mock vector-rendered SVG/HTML deed sheets with high-resolution scanned PDFs/TIFFs once ingested from the live file store. |
| **Backend Endpoints** | `src/lib/api.ts` & `src/lib/chat.ts` | Point to live FastAPI endpoints for audit pipeline execution and token-streamed chat completion. |
