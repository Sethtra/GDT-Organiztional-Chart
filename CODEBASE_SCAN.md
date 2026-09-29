# GDT Organizational Chart — Complete Codebase & Architectural Scan

> **Target Audience**: AI models, LLMs, and software engineers ingesting this project for autonomous reasoning, refactoring, feature implementation, and architectural auditing.
> **Date of Scan**: September 25, 2026
> **Workspace Root**: `c:\Users\Dell\OneDrive\Desktop\GDT Organizetional Chart`
> **Repository Name**: `Sethtra/GDT-Organiztional-Chart`
> **Current Health Summary**:
> - TypeScript Strict Typecheck: ✅ **PASS** (`0 errors`)
> - Oxlint: ✅ **PASS** (`0 errors`)
> - Node Schema & Lifecycle Suite (`npm run test:node`): ✅ **PASS** (`84/84 tests`)
> - Vitest Unit & Component Suite (`npm run test:unit`): ⚠️ **35 passed, 1 failed** (3 test assertions failed in `test/hrContracts.test.ts` due to active uncommitted work adding the `major` column in migration `2026092101_add_staff_major.sql`)

---

## 1. Executive Summary & Domain Context

### 1.1 The Organization & Mission
- **Agency**: General Department of Taxation (អគ្គនាយកដ្ឋានពន្ធដារ — GDT), Ministry of Economy and Finance, Royal Government of Cambodia.
- **Project Purpose**: Digitize the organizational hierarchy, personnel directory, job architecture, and staff movement for GDT.
- **Primary Language**: Bilingual Khmer (ខ្មែរ) + English. Khmer is the primary language for staff-facing records, official titles, and display labels. Khmer appears first wherever both languages are presented together.
- **Operating Reality**: The application manages real GDT personnel and organizational data across departments, provincial tax branches, and district offices.

### 1.2 Core Architectural Philosophy: "Privacy by Architecture"
Unlike generic org-chart tools that bundle employee profile records directly inside chart node JSON payloads, this system enforces a strict architectural boundary:
1. **Chart Canvas Data (`charts.nodes`, `charts.edges`)**: Contains **only visual layout**, node geometry, connection topologies, styling parameters, and safe display projections (`name`, `nameEn`, `positionTitle`, `photoUrl`, `dbStaffId`, `dbAssignmentId`).
2. **Relational Personnel Data (`staff`, `staff_sensitive`, `position_assignments`, `staff_skills`, etc.)**: Kept in normalized PostgreSQL tables protected by Row-Level Security (RLS) and Security Definer RPC functions.
3. **Right-Click-Only Profile Friction**: Chart nodes never open personnel records on a normal left click. Left-click selects the canvas node. Right-click opens a context menu with **"View Details"**, which makes an authorized RPC call (`get_staff_profile`). This deliberate UX friction prevents accidental exposure of PII on shared screens or public presentations.
4. **Multi-Tier Privacy Projections**:
   - **Public Visitors**: Unauthenticated read-only access via `get_chart_for_viewer` RPC. Can view the structure and safe display labels; cannot open staff profiles.
   - **Invited Viewers**: Authenticated access to specific charts. Can open staff profiles, but sees a **masked National ID**.
   - **Invited Editors**: Can edit chart layout and perform atomic staff assignment operations (assign, transfer, vacate). Sees a **masked National ID**.
   - **HR Administrators (`hr_admin`)**: Full GDT-wide management of staff directory, job titles, skill requirements, organizational units, and can view the unmasked National ID (stored in `staff_sensitive`).

---

## 2. Technology Stack & Tooling Matrix

| Layer | Technology | Version | Purpose / Architecture Rationale |
|---|---|---|---|
| **Runtime & Core** | React | `19.2.7` | UI library using React 19 features |
| **Build Tool & Dev Server** | Vite | `8.1.1` | Ultra-fast ESM bundler with strict security headers |
| **Routing** | React Router DOM | `7.18.2` | Client-side routing with route guards |
| **Graph & Canvas** | `@xyflow/react` | `12.11.2` | React Flow canvas for drag-and-drop node/edge graph editing |
| **Graph Auto-Layout** | `@dagrejs/dagre` | `3.0.0` | Hierarchical directed graph layout calculation |
| **Type System** | TypeScript | `7.0.2` | Strict mode typing (`tsc --noEmit`) |
| **Contract Validation** | Zod | `4.4.3` | Runtime schema parsing and boundary validation |
| **Styling & Design System** | Tailwind CSS | `4.3.3` | Tailwind v4 with preflight disabled, paired with custom CSS variables |
| **UI Primitives** | Radix UI | `@radix-ui/react-dialog` 1.1.23 | Accessible, unstyled modal dialog primitives |
| **Icons** | Lucide React | `1.22.0` | SVG icons for actions, navigation, and badges |
| **Image Export** | `html-to-image` | `1.11.13` | Canvas rendering for PNG/SVG chart export and thumbnails |
| **Backend & Database** | Supabase JS | `2.110.0` | PostgreSQL client with custom secure auth token storage |
| **Serverless / Edge** | Deno / Supabase Edge Functions | Deno runtime | Protected account deletion function (`delete-account`) |
| **Linter** | Oxlint | `1.71.0` | Fast Rust-based linter |
| **Testing: Unit & UI** | Vitest | `4.1.10` | Vite-native test runner with JSDOM and Testing Library |
| **Testing: Schema & Node** | Node.js Test Runner | `node --test` | Zero-dependency native tests for schemas, migrations, and utils |
| **Testing: E2E** | Playwright | `1.62.0` | Browser end-to-end integration test suite |
| **Hosting & Deployment** | Vercel | N/A | SPA rewrites, Content Security Policy, strict headers (`vercel.json`) |

---

## 3. Complete Directory Tree & Component Mapping

```text
GDT Organizational Chart/
├── .agents/                    # Agent personas, skills, and design rules
├── backups/                    # Checkpoint dumps, recovery archives, database dumps
├── docs/                       # Technical runbooks and rollout procedures
│   ├── account-lifecycle-rollout.md
│   ├── baseline-report.md
│   ├── database-rollout.md
│   ├── hr-admin-provisioning.md
│   ├── implementation-progress.md
│   └── rollout-handoff-2026-07-27.md
├── e2e/                        # Playwright end-to-end tests & session helpers
│   ├── helpers/mockHrAdminSession.js
│   ├── admin-dashboard-test.spec.js
│   ├── admin-org-structure-test.spec.js
│   ├── header-consistency.spec.js
│   ├── org-node-test-route.spec.js
│   ├── public-landing.spec.js
│   ├── responsive-surfaces.spec.js
│   ├── staff-directory-promotion-filter.spec.js
│   └── staff-directory.spec.js
├── migrations/                 # 31 SQL migration scripts (chronological)
├── public/                     # Static assets (GDT logos, seals, icons, touch icons)
├── scripts/                    # Database rollout, verification, and migration scripts
│   ├── lib/dummy-data-cleanup.mjs
│   ├── sql/dummy_cleanup_dry_run.sql
│   ├── sql/restore_legacy_dummy_cleanup.sql
│   ├── analyze-dummy-chart-data.mjs
│   ├── deploy-account-function.ps1
│   ├── deploy-supabase.ps1
│   ├── direct-database-rollout.mjs
│   ├── extract-staff-workbook.ps1
│   ├── generate-supabase-types.mjs
│   └── staff-workbook-import.mjs
├── src/                        # Main application source code
│   ├── assets/                 # SVGs and UI graphics
│   ├── components/             # Reusable UI components & dialogs
│   │   ├── admin/              # Admin dashboard headers, sidebar, metric panels
│   │   ├── dashboard/          # User dashboard cards (FolderCard, RegisterChartCard)
│   │   ├── editor/             # React Flow editor shell, alignment, controls, header
│   │   ├── properties/         # Properties panel (node, edge, HR assignment tabs)
│   │   ├── staff/              # Staff profile dialog, crop dialog, form dialog, skills
│   │   └── ui/                 # Primitives (Radix dialog wrappers, toasts)
│   ├── config/                 # Feature flags (`hrFeatures.ts`, `chartFeatures.ts`)
│   ├── contexts/               # React Contexts (TabContext, ChartContext, ThemeContext)
│   ├── contracts/              # Strict Zod validation schemas (hr, chart, activityLog)
│   ├── data/                   # Default node types, edge options, initial templates
│   ├── hooks/                  # Custom React hooks (auth, persistence, history, HR)
│   ├── lib/                    # Shared utilities (`utils.ts` with cn helper)
│   ├── pages/                  # Route views (Landing, Dashboard, Staff, Admin, Editor)
│   ├── services/               # API & Supabase RPC service layer
│   ├── styles/                 # Specialized CSS modules and themes
│   ├── types/                  # TypeScript interface declarations
│   ├── utils/                  # Domain utilities (projection, snapping, formatting)
│   ├── App.jsx                 # Top-level routing layout & EditorShell mounting
│   ├── main.jsx                # React DOM root entry
│   ├── supabaseClient.ts       # Supabase client with obfuscated storage adapter
│   └── vite-env.d.ts           # Vite client environment typing
├── supabase/                   # Supabase local config & edge functions
│   ├── functions/delete-account/index.ts
│   └── config.toml
├── test/                       # 54 test files (Vitest & Node test runner)
├── .env.example                # Example environment variable specifications
├── .oxlintrc.json              # Oxlint linting configuration
├── AGENTS.md                   # Agent guidelines & coding standards
├── DESIGN.md                   # Complete Design Tokens & Visual Specs
├── PRODUCT.md                  # Product Specification & Business Model
├── README.md                   # Local setup, run scripts, and system summary
├── components.json             # Shadcn component configuration
├── index.html                  # HTML entrypoint with font imports
├── migration_core_schema.sql   # Initial foundation schema
├── migration_org_structure.sql # Initial organizational hierarchy schema
├── package.json                # Project dependencies, scripts, and engine specs
├── playwright.config.js        # Playwright test configuration
├── tsconfig.json               # Strict TypeScript configuration
├── vercel.json                 # Vercel deployment rewrites & security headers
├── vite.config.js              # Vite server & build configuration
├── vitest.config.js            # Vitest environment setup
└── vitest.setup.js             # Vitest test setup and DOM mock definitions
```

---

## 4. Security, Authentication & Session Architecture

### 4.1 Token Storage Security (`src/supabaseClient.ts`)
Default Supabase clients store access and refresh tokens in `localStorage` in cleartext under predictable keys. In this codebase:
- A custom `secureStorage` adapter intercepts all auth storage calls.
- Keys are prefixed with `__gdt_s_`.
- Token values are obfuscated via URI encoding + Base64 encoding.
- While not a substitute for HTTP-only cookies, this provides defense-in-depth against generic browser XSS scripts crawling `localStorage` for plain JWT strings.
- **Session Cleanup (`clearSensitiveCache` in `src/hooks/useAuth.js`)**: On sign-out, all `__gdt_s_*` tokens, cached chart drafts (`chart_backup_*`), and user preferences are purged.

### 4.2 Content Security Policy & HTTP Headers (`vite.config.js`, `vercel.json`)
The application enforces strict security headers both in development and production:
```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co ws://localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```

### 4.3 Role-Based Access Control (RBAC)
- Defined in `migrations/2026072701_add_hr_admin_rbac.sql`.
- App role: `public.app_role` enum (`'hr_admin'`).
- Role assignment stored in `public.user_roles (user_id, role, granted_at, granted_by)`.
- Verification functions:
  ```sql
  CREATE FUNCTION public.is_hr_admin() RETURNS BOOLEAN ...
  ```
- **Provisioning Principle**: The first HR admin is provisioned manually through database admin scripts or `docs/hr-admin-provisioning.md`. There is **no self-service role escalation** and no hardcoded administrator email in source code.

---

## 5. Database Schema & Migration Architecture

The database utilizes PostgreSQL 15+ hosted on Supabase, featuring 31 numbered migration scripts and 2 initial baseline migrations.

### 5.1 Core Tables & Relationships

```mermaid
erDiagram
    auth_users ||--o{ charts : "owns"
    auth_users ||--o{ chart_folders : "owns"
    auth_users ||--o{ user_roles : "assigned"
    chart_folders ||--o{ charts : "contains"
    charts ||--o{ chart_shares : "shared_via"
    charts ||--o{ chart_versions : "history"
    charts ||--o{ positions : "defines"
    
    org_units ||--o{ org_offices : "groups"
    org_units ||--o{ staff_placements : "locates"
    org_offices ||--o{ staff_placements : "sub-locates"
    
    job_titles ||--o{ job_title_skill_requirements : "requires"
    job_titles ||--o{ staff : "categorizes"
    
    skills ||--o{ job_title_skill_requirements : "referenced"
    skills ||--o{ staff_skill_history : "logged"
    
    staff ||--o{ position_assignments : "occupies"
    staff ||--o{ staff_placements : "placed_in"
    staff ||--|| staff_sensitive : "private_pii"
    staff ||--o{ staff_skill_history : "possesses"
    
    positions ||--o{ position_assignments : "held_by"
```

### 5.2 Chronological Migration Ledger

1. `migration_core_schema.sql`: Core tables (`chart_folders`, `charts`, `chart_shares`, `chart_versions`, `positions`, `staff`, `position_assignments`).
2. `migration_org_structure.sql`: Reference tables (`org_units`: department/district/province; `org_offices`).
3. `migrations/2026072701_add_hr_admin_rbac.sql`: Creates `app_role` enum and `user_roles` table, defines `is_hr_admin()`.
4. `migrations/2026072702_secure_global_staff_directory.sql`: Splits sensitive PII (National ID) into `staff_sensitive`. Adds RLS preventing non-HR users from viewing raw directory.
5. `migrations/2026072703_add_job_titles_and_reporting.sql`: Creates `job_titles` with rank ordering and position scopes.
6. `migrations/2026072704_add_skills_and_requirements.sql`: Creates `skills` catalog and `job_title_skill_requirements` (levels 1–5).
7. `migrations/2026072705_add_atomic_assignment_operations.sql`: Stored procedures for atomic assign, transfer, and vacate operations.
8. `migrations/2026072706_add_staff_directory_api.sql`: RPCs `get_hr_staff_directory`, `find_staff_duplicates`, `archive_staff_record`.
9. `migrations/2026072707_add_position_assignment_api.sql`: RPCs `get_chart_assignment_candidates`, `get_position_assignment_summary`.
10. `migrations/2026072708_add_profile_and_skill_api.sql`: RPCs `get_staff_profile`, `save_staff_skills`, `evaluate_staff_job_fit`.
11. `migrations/2026072709_add_job_architecture_api.sql`: RPCs `get_job_architecture`, `save_job_title`, `save_job_title_requirement`.
12. `migrations/2026072710_add_position_configuration_api.sql`: RPCs `configure_chart_position`, `get_chart_for_viewer`.
13. `migrations/2026072911_cleanup_legacy_dummy_staff.sql`: Cleans legacy placeholder records safely without data loss.
14. `migrations/2026072912_refine_staff_profile_and_positions.sql`: Standardizes position ordering and refines staff profiles.
15. `migrations/2026072913_add_staff_placements.sql`: Introduces `staff_placements` table to decouple relational organizational location from chart nodes.
16. `migrations/2026072914_normalize_assignment_dates.sql`: Normalizes legacy assignment joined/left date formats.
17. `migrations/2026072915_add_staff_placement_save_api.sql`: Stored procedure `save_staff_record_with_placement`.
18. `migrations/2026072916_refine_assignment_candidates.sql`: Filters candidates based on active department and office placements.
19. `migrations/2026073001_add_department_scoped_skill_requirements.sql`: Scopes skill requirements to specific departments.
20. `migrations/2026080401_add_staff_photo.sql`: Adds `photo_url` column and Supabase Storage integration (`Profile` bucket).
21. `migrations/2026081101_add_promotion_readiness.sql`: Computes qualification for next title rank (`get_promotion_readiness`).
22. `migrations/2026081102_remove_legacy_skill_rpc_overloads.sql`: Drops deprecated RPC signatures.
23. `migrations/2026082001_add_job_architecture_delete_api.sql`: Safe cascading delete procedures for job titles and skills.
24. `migrations/2026082002_add_account_deletion_support.sql`: Function `prepare_account_deletion` for GDPR/account cleanup.
25. `migrations/2026082101_add_staff_excel_import.sql`: Stored procedure for bulk importing parsed Excel workbook records.
26. `migrations/2026082102_fix_staff_import_source_hash.sql`: Checksums import payloads for deduplication.
27. `migrations/2026082103_normalize_imported_skills.sql`: Trims and case-normalizes skill names during import.
28. `migrations/2026082901_add_hr_activity_log.sql`: Creates `hr_activity_log` table and event audit system.
29. `migrations/2026082902_fix_activity_log_triggers.sql`: Refines triggers on staff, placement, and assignment tables.
30. `migrations/2026082903_fix_hr_activity_log_rpc_volatility.sql`: Adjusts volatility tags (`STABLE`/`VOLATILE`) on log RPCs.
31. `migrations/2026090101_add_org_unit_name_en_and_code.sql`: Adds English names (`name_en`) and short codes (`code`) to `org_units`.
32. `migrations/2026090102_add_org_unit_activity_log_triggers.sql`: Connects unit changes to activity logs.
33. `migrations/2026092101_add_staff_major.sql`: *(Recent/Active)* Adds `major` (field of study) to staff records and updates `save_staff_record`.

---

## 6. Frontend Architecture & State Management

### 6.1 Unmounting Prevention: The Persistent `EditorShell` Pattern (`src/App.jsx`, `src/components/editor/EditorShell.jsx`)
In a typical React Router application, switching from `/chart/:id` to `/dashboard` unmounts the chart component, wiping React Flow's internal state, viewport transformations, and undo/redo stacks.
- **Architectural Solution**:
  - In `src/App.jsx`, the route `<Route path="/chart/:chartId" element={<div />} />` renders a dummy placeholder.
  - The actual editor (`<EditorShell />`) is rendered **outside** the `<Routes>` tree.
  - `EditorShell` consumes `TabContext`. It maintains an array of `openTabs`.
  - For each open tab, a `<FlowApp />` instance is mounted inside an absolute container.
  - Active vs. inactive tabs are switched using CSS:
    ```jsx
    opacity: id === activeTabId ? 1 : 0,
    zIndex: id === activeTabId ? 1 : -1,
    pointerEvents: id === activeTabId ? 'auto' : 'none',
    ```
  - **Result**: Navigating to dashboard or between multiple open chart tabs does **not** unmount the canvas. Pan/zoom positions, undo history, and unsaved transient states remain completely intact in memory.

### 6.2 Local-First Persistence Engine (`src/hooks/useChartPersistence.ts`)
To protect against network dropouts, power failure, or accidental tab closures:
1. **Immediate Local Recovery**: Every node movement or edit writes synchronously to browser `localStorage` under `chart_backup_${chartId}`.
2. **Debounced Cloud Sync**: Cloud writes to Supabase table `charts` are serialized and debounced (default 1000ms).
3. **Optimistic Locking**: Prevents concurrent editors from silently overwriting each other.
4. **Automated Safety Versions**: Every 5 minutes, if changes have occurred, a snapshot row is automatically inserted into `chart_versions`.
5. **JSON Backup / Restore (`src/utils/chartBackup.ts`)**:
   - Users can export a validated standalone `.json` recovery file (`ChartSnapshotSchema`).
   - Restoring a JSON backup validates the schema with Zod before replacing active nodes/edges.

### 6.3 Canvas Interaction & Smart Layout Features
- **Custom Nodes (`OrgNode.jsx` & `OrgNodePro.jsx`)**:
  - Supports 5 node shapes: `orgNode` (organizational unit), `individualNode` (person card), `roundNode`, `diamondNode`, `squareNode`.
  - Dynamic connection handles that highlight on connector drag.
- **Connector Snapping & Ink (`src/utils/edgeSnapping.js`, `CustomEdge.jsx`)**:
  - Floating connectors that anchor to the closest logical handle of target nodes.
  - Smooth Bezier or orthogonal paths with custom line styling, marker ends, and label rendering.
- **Smart Guides & Alignment (`src/utils/nodeAlignment.js`, `AlignmentGuides.jsx`)**:
  - Dynamic alignment lines appear when dragging nodes within 6px of sibling node centers or edges.
  - Smart resize guides (`SmartNodeResizer.jsx`) that snap to matching widths and heights of neighboring nodes.

---

## 7. HR & Personnel Subsystems

### 7.1 GDT Staff Directory (`src/pages/StaffDirectoryPage.tsx`)
- Server-side filtered pagination (page sizes: 10, 20, 50).
- Real-time search by Khmer name, English name, or Employee ID (`GDT-XXXX`).
- Multi-dimensional filters: Department, Office, Job Title, Gender, Promotion Readiness, and Archived status.
- Duplicate detection warning dialog before saving new officers.
- Photo cropper modal (`PhotoCropDialog.tsx`) with Visio-style pan/zoom controls, outputting optimized WebP images uploaded to Supabase Storage bucket `Profile`.

### 7.2 Job Architecture & Skill Matrix (`src/pages/JobArchitecturePage.tsx`)
- Configures GDT official job titles (`job_titles`) with hierarchical `rank_order`.
- Position Scopes: `individual`, `office`, `department`, `organization`.
- Skills catalog (`skills`) with description and active flags.
- Job Title Skill Requirements (`job_title_skill_requirements`): assigns required skills with minimum expected proficiency (1: Fundamental, 2: Developing, 3: Proficient, 4: Advanced, 5: Expert).
- Department scoping allows tax inspection departments to have different requirements from legal or IT departments.

### 7.3 Promotion Readiness Engine (`src/services/promotionReadinessService.ts`)
- Automatically evaluates each officer's current skill profile against the requirements of the immediately next rank order (`targetJobTitle`).
- Statuses computed:
  - `ready`: All required skills met or exceeded.
  - `not_ready`: One or more required skills missing or below minimum proficiency.
  - `not_configured`: Target job title has no requirements defined.
  - `no_current_title`: Officer has no assigned job title.
  - `no_next_title`: Officer already holds the highest rank.

### 7.4 HR Activity Audit Log (`src/pages/AdminActivityPage.tsx`)
- Automatic audit trails triggered at database level for:
  - `officer_created`, `profile_updated`, `promoted`, `transferred`, `assigned`, `position_vacated`, `skills_updated`, `unit_created`, `unit_updated`.
- Stored in `hr_activity_log` with JSON metadata, old/new diffs, and timestamp.

---

## 8. Design System & Typography Specifications

Defined in `DESIGN.md` and implemented across `pa-theme.css`, `gov-auth.css`, and `chart-editor.css`:

### 8.1 Color Palette Tokens
- **Primary Brand Green**: `#136232` (`--pa-primary`) — Official GDT tax green.
- **Primary Dark/Hover**: `#0d4825` (`--pa-primary-hover`).
- **Accent Gold**: `#cda851` (`--pa-gold`), `#735413` (text contrast).
- **Background Canvas**: `#f4f6f5` (`--pa-canvas`).
- **Sidebar Surface**: `#0d2719` (`--pa-sidebar`).
- **Text Primary**: `#0f1713` (`--pa-text`).
- **Text Muted**: `#47524c` (`--pa-muted`).
- **Borders**: `#dbe2dd` (`--pa-border`).

### 8.2 Typography Hierarchy
- **Khmer Ceremonial Display Headings**: Google Fonts `"Moul"` (Khmer OS Muol equivalent) — used for official department banners, landing titles, and formal headers.
- **Khmer Body & UI**: Google Fonts `"Noto Sans Khmer"` — used for forms, table rows, button labels, and descriptions.
- **Latin & Numerical Text**: Google Fonts `"Manrope"` / `"Inter"` — clean geometric sans-serif for numbers, codes, dates, and English subtitles.

---

## 9. Verification & Test Suite Structure

The workspace includes 3 distinct test runners with over 170 individual test cases:

### 9.1 Test Runners & Commands
1. **Node.js Native Test Runner (`npm run test:node`)**:
   - Executes `test/*.test.js` using `node --test`.
   - Runs 84 tests covering database migrations, rollback transactions, backup validation, task queues, edge snapping, and contract boundaries.
   - **Status**: 100% Passing (84/84).
2. **Vitest Unit & Component Suite (`npm run test:unit`)**:
   - Executes `.test.tsx` and `.test.ts` files using JSDOM.
   - Tests React hooks (`useChartPersistence`, `useChartHistory`), page rendering (`AdminDashboardPage`, `StaffDirectoryPage`, `JobArchitecturePage`), and Zod contracts.
   - **Status**: 35 passed, 1 failed (3 failures in `test/hrContracts.test.ts`).
3. **Playwright End-to-End Suite (`npm run test:e2e`)**:
   - Executes `e2e/*.spec.js` against Chromium.
   - Tests public landing page, session mocking, responsive surfaces, and admin portal security.
4. **TypeScript Strict Typecheck (`npm run typecheck`)**:
   - Executes `tsc --noEmit`.
   - **Status**: 100% Passing (0 errors).
5. **Oxlint Fast Linter (`npm run lint`)**:
   - **Status**: 100% Passing (0 errors in project source).

### 9.2 Investigation of Known Failing Tests in `test/hrContracts.test.ts`
During this scan, 3 tests in `test/hrContracts.test.ts` failed:
1. `requires position, date of birth, and joined date`
2. `accepts PostgreSQL timestamp offsets in directory records`
3. `uses the same refined profile fields for HR and invited viewers`

**Root Cause**:
In `src/contracts/hr.ts` (lines 76 and 169), the new `major` field was recently introduced to support migration `migrations/2026092101_add_staff_major.sql`:
```ts
major: z.string().trim().max(500, 'Major is too long.').nullable(),
```
Because `major` is defined as `.nullable()` without `.default(null)` or `.optional()`, existing test mock objects in `test/hrContracts.test.ts` that omit `major` trigger a Zod parsing error (`Invalid input: expected string, received undefined`).
**Recommended Solution**:
In `src/contracts/hr.ts`, make `major` default to `null` on input schemas (`major: z.string().trim().max(500).nullable().default(null)`), and ensure test fixtures include `major: null`.

---

## 10. Environment Configuration & Deployment Runbook

### 10.1 Environment Variables (`.env.local`)
```env
# Required Supabase Connection
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Staged Feature Flags (Defaults to false until verified)
VITE_HR_FEATURES_ENABLED=true
VITE_CHART_VERSION_WRITES_ENABLED=true

# Operational / Database Migration Variables (PowerShell session only, NEVER commit)
# $env:GDT_DATABASE_URL="postgres://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
# $env:GDT_HR_ADMIN_EMAIL="verified-hr-admin@gdt.gov.kh"
# $env:GDT_SSL_CA_FILE="backups/supabase-ca/prod-ca-2021.crt"
```

### 10.2 Database Rollout Procedure (`scripts/deploy-supabase.ps1`, `docs/database-rollout.md`)
1. **Pre-flight Backup**:
   Run `npm run db:rollout:check` to export all public tables and schema definitions into `backups/database/pre-rollout-<timestamp>/` with SHA-256 checksums.
2. **Atomic Transactional Rollout**:
   Run `npm run db:rollout` to apply all pending migrations and first-admin provisioning inside a single PostgreSQL transaction (`BEGIN ... COMMIT`). If any statement fails, the entire change rolls back automatically.
3. **Post-Rollout Type Regeneration**:
   Run `npm run db:types` with a valid `SUPABASE_ACCESS_TOKEN` to generate `src/types/database.types.ts`.

---

## 11. Essential Guidelines for AI Models & Developers

When operating in this codebase:
1. **Strict Git Safety**: NEVER execute `git add`, `git commit`, or `git push` without explicit user instruction.
2. **Preserve Architectural Separation**: NEVER put personal identifiable information (email, phone, National ID, education, major, skills, history) inside chart node JSON. Only projection references (`dbStaffId`, `dbAssignmentId`, `positionId`) and display strings (`name`, `positionTitle`, `photoUrl`) are permitted in chart nodes.
3. **Respect Right-Click Friction**: Do NOT add click-to-open handlers for staff profiles to chart nodes. Profile inspection must remain behind right-click context menu ("View Details").
4. **Zod Boundary Enforcement**: All external responses from Supabase RPCs, REST calls, or file imports must pass through `safeParse` against schemas in `src/contracts/`.
5. **No Secret Commits**: Never write database connection strings, passwords, or service-role keys into `.env*` or code files.
6. **Code Cleanliness**: Remove all temporary debug scripts, dangling `console.log` statements, and dead imports before completing tasks.
