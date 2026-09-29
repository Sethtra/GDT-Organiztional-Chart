# TypeScript (TSX/TS) Migration Trajectory & Strategy

## Executive Summary

The codebase currently operates in a hybrid **JavaScript / TypeScript** state (~40% TS/TSX, ~60% JS/JSX).
To ensure long-term maintainability, eliminate runtime prop/state type errors, and maintain strict schema guarantees across the HR, Canvas, and Admin layers, this document outlines the completed foundations and the phased trajectory for achieving full TypeScript coverage.

---

## 1. Migration Architecture & Principles

1. **Strict Boundary Typing First (Outside-In)**:
   - Schema contracts (`src/contracts/`) and Database row types (`src/types/database.types.ts`) provide the single source of truth using Zod + TypeScript inference.
   - All external data (Supabase responses, API payloads) must pass through typed schemas before reaching UI state.

2. **No Implicit `any`**:
   - As files are converted to `.ts` / `.tsx`, strict typing is enforced. Avoid loose `any` casts; use `unknown` with narrowing or schema assertions.

3. **Incremental Migration without Regressions**:
   - Maintain backwards-compatibility for components still written in `.jsx` by providing clean `.d.ts` or typed props where consumed by `.tsx` components.

---

## 2. Current Progress & Status Matrix

| Layer | Coverage | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Contracts & Validation** (`src/contracts/*`) | **100%** | Complete | `hr.ts`, `activityLog.ts`, etc. fully validated with Zod schemas. |
| **Database Types** (`src/types/*`) | **90%** | In Progress | Core tables (`staff`, `org_units`, `positions`, `job_titles`, `position_assignments`) typed; Supabase client integrated. |
| **Services Layer** (`src/services/*`) | **85%** | High | `staffService.ts`, `departmentService.ts`, `jobArchitectureService.ts` in TS. |
| **Admin Pages** (`src/pages/Admin*.tsx`, etc.) | **75%** | High | `StaffDirectoryPage.tsx`, `JobArchitecturePage.tsx`, `AdminActivityPage.tsx`, `AdminDashboardPage.tsx` converted. |
| **Custom Hooks** (`src/hooks/*`) | **40%** | Moderate | Key business hooks in TS; canvas hooks (`useCanvasInteractions.js`, `useFlowAppModals.js`) in JS. |
| **Editor & Flow Components** (`src/components/editor/*`) | **15%** | Low | High complexity canvas components (`FlowApp.jsx`, nodes, edges) remain in JSX. |
| **Shared UI & Modals** (`src/components/ui/*`) | **50%** | Moderate | Mix of shadcn TS components and legacy JSX modals. |

---

## 3. Phased Execution Roadmap

### Phase 1: Foundational Layers (Completed)
- [x] Defined Zod schemas and TypeScript types for all HR domain entities (`src/contracts/hr.ts`).
- [x] Enhanced database schema types with concrete row structures (`src/types/database.types.ts`).
- [x] Converted core HR admin pages and sub-panels to `.tsx`.

### Phase 2: Hooks & State Layer (Next Priority)
Focus on migrating all custom hooks to `.ts`, establishing strict return types and parameter contracts:
1. `src/hooks/useCanvasInteractions.js` -> `useCanvasInteractions.ts`
   - Type reactflow events, node positions, drag callbacks, and alignment guide structures.
2. `src/hooks/useFlowAppModals.js` -> `useFlowAppModals.ts`
   - Type modal states, pending actions, and active confirmation payloads.
3. `src/hooks/useAutoSave.js` -> `useAutoSave.ts`
   - Type debounce triggers, save handlers, and dirty state management.
4. `src/hooks/useDepartmentCoverage.ts` (Already TS; verify runtime parity).

### Phase 3: Core Flow & Canvas Components
The ReactFlow canvas engine is the core product feature. Migrate cautiously with comprehensive tests:
1. `src/components/editor/EditorHeader.jsx` -> `EditorHeader.tsx`
2. `src/components/editor/EditorSidebar.jsx` -> `EditorSidebar.tsx`
3. Node Components (`src/components/editor/nodes/*.jsx`):
   - `DepartmentNode.jsx` -> `DepartmentNode.tsx`
   - `PositionNode.jsx` -> `PositionNode.tsx`
   - `StaffNode.jsx` -> `StaffNode.tsx`
4. `src/components/editor/FlowApp.jsx` -> `FlowApp.tsx`:
   - Decomposed hooks allow `FlowApp.tsx` to serve purely as the composition shell.

### Phase 4: Shared Modals & Property Panels
1. `src/components/properties/NodePropertiesPanel.jsx` -> `NodePropertiesPanel.tsx`
2. `src/components/modals/*.jsx` -> `*.tsx`
3. `src/components/ProfileDrawer.jsx` -> `ProfileDrawer.tsx`

---

## 4. Verification & Quality Gates

Each converted file must pass the following verification checks:
1. **Typecheck**: `npx tsc --noEmit` must report zero errors on the migrated file.
2. **Linter**: `npx oxlint` must confirm code cleanliness.
3. **Unit Tests**: `npx vitest run` must pass with zero regressions.
4. **Bundle Build**: `npm run build` must complete cleanly without syntax or bundling issues.
