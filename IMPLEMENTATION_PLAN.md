# Implementation Plan: GDT Staff Directory, Position Assignment, and Modernization

## Status

- Current status: **source implementation prepared; database rollout blocked by
  the full-database-backup gate**.
- The user authorized completing the implementation as one continuous batch,
  while preserving recoverability.
- Destructive data changes are prohibited until a database backup, chart export,
  dry-run report, and explicit cleanup approval exist.
- Current progress and release gates: `docs/implementation-progress.md`
- Safe database workflow: `docs/database-rollout.md`
- Baseline report: `docs/baseline-report.md`

## Overview

Build a GDT-wide staff directory managed by HR administrators, connect staff to
organizational-chart positions without copying private data into chart JSON,
record position and skill history, and modernize the application incrementally.
Charts remain separately owned and shared. Public chart visitors receive only
safe chart display data; invited viewers and chart editors may view permitted
profiles with a masked National ID; HR administrators may view the full record.

## Confirmed Product Decisions

- The staff directory is shared across the GDT organization.
- HR administrators create and maintain staff records.
- The first HR administrator is assigned manually.
- Future HR-controlled account provisioning is out of scope for this project.
- A chart remains owner-controlled; authenticated users need an accepted chart
  invitation unless they are the owner or an HR administrator acting within
  their organization-wide authority.
- Public visitors never receive private profile fields.
- Invited viewers and chart editors may see staff profiles, but National ID is
  masked. Only HR administrators receive the full National ID.
- Age is stored as an integer entered by HR.
- One staff member may hold at most one active position.
- One position may have at most one active occupant.
- Department determines the available offices.
- Reporting follows the organizational hierarchy:
  - ordinary staff report within their office;
  - office leadership may report to department leadership;
  - department leadership may report to a parent organizational level.
- Reporting is attached to a supervisor position; the UI displays its current
  occupant. Self-reporting and reporting cycles are invalid.
- Skills use proficiency levels 1–5:
  1. Basic awareness
  2. Working knowledge with guidance
  3. Proficient and independent
  4. Advanced and able to guide others
  5. Expert or organizational authority
- Required skills are defined for reusable job titles and include a minimum
  proficiency.
- A profile opens in a centered dialog only from right-click → **View Details**.
- A historical staff entry opens the person's current profile and also displays
  all previous assignments with joined date, left date, reason, and notes.
- Existing individual occupants, personal information, skills, and history are
  dummy data and will be cleared.
- Existing chart nodes, node IDs, layout, edges, job/position structure,
  departments, offices, colors, and organizational data must be preserved.
- Existing uncommitted source changes belong to the user and must be preserved.

## Architecture Decisions

### Sources of truth

- `charts.nodes` and `charts.edges` remain the visual chart source of truth.
- Relational tables become the source of truth for staff, job titles, skills,
  position assignments, and assignment history.
- Chart JSON stores only stable relational references and safe display data.
  Full phone, email, address, National ID, marital status, education, personal
  skills, and copied assignment history must not remain in chart JSON.

### Authorization model

- `hr_admin` is a global application role stored in protected database data.
- Chart owner, editor, and viewer are resource permissions, not global roles.
- Chart editor rights continue to come from chart ownership or an accepted
  `edit` share.
- Staff mutations require `hr_admin`.
- Position assignment, transfer, and vacancy operations require `hr_admin` or
  edit permission on the target chart.
- Profile reads require `hr_admin` or view permission on a chart to which the
  staff member has a current or historical assignment.
- Full National ID is stored behind HR-only access. Non-HR profile contracts
  return a masked representation and never return the full value to the client.
- Public chart contracts do not expose a staff profile endpoint.

### Reporting hierarchy

- A chart position references `reports_to_position_id`, not a person's name.
- Candidate supervisors are validated against department, office, job level,
  and parent organizational structure.
- The currently active occupant of the supervisor position is displayed as the
  reporting officer.
- A vacant supervisor position remains part of the reporting hierarchy.

### Skills

- Skills are reusable catalog records.
- Staff skill proficiency is temporal so changes are auditable.
- Job-title requirements specify a minimum level.
- A fit result is calculated by comparing active staff-skill levels with job
  requirements; missing skills and below-minimum skills are shown explicitly.

### Assignment operations

- Assign, transfer, promote, vacate, retire, resign, and suspend are performed
  through transactional database operations.
- A transfer closes the previous assignment and opens the new assignment in
  one transaction.
- Staff with historical assignments are archived rather than hard-deleted.
- Duplicate checks use employee ID, National ID, and email and return the
  existing person's current position, department, and office.

### Frontend modernization

- TypeScript is introduced incrementally; new modules are TypeScript.
- Vite type checking is a separate `npm run typecheck` gate.
- Supabase database types are generated from the schema.
- Runtime validation is used at Supabase JSON, local-backup, and form
  boundaries; TypeScript types alone are not treated as runtime validation.
- Tailwind CSS v4 is introduced through the Vite plugin and semantic tokens.
- Existing CSS and React Flow geometry coexist until each surface is verified.
- Shadcn/Radix primitives are introduced first for an accessible dialog.
- The existing GDT visual identity, light/dark themes, information density, and
  Khmer content support are preserved.

## Permission Matrix

| Capability | Public visitor | Invited viewer | Chart owner/editor | HR administrator |
| --- | --- | --- | --- | --- |
| View safe public chart | If public | Yes | Yes | Yes |
| View private chart | No | If invited | Yes | As authorized |
| View permitted staff profile | No | Read-only | Read-only | Full |
| View full National ID | No | No | No | Yes |
| View masked National ID | No | Yes | Yes | Yes |
| Create/update/archive staff | No | No | No | Yes |
| Manage skill catalog | No | No | No | Yes |
| Manage job-title requirements | No | No | No | Yes |
| Assign/transfer/vacate in editable chart | No | No | Yes | Yes |
| Manage organizational reference data | No | No | No | Yes |

## Task Execution Workflow

The implementation now proceeds continuously through all safe source changes.
Recovery checkpoints and focused verification remain mandatory. Live migration,
production cleanup, and other destructive data operations remain separate
release gates and require a verified database export plus explicit approval.

After TypeScript is installed, the standard broad check is:

```text
npm run lint
npm test
npm run typecheck
npm run build
```

## Phase 0 — Safety and Characterization

### Task 1: Backup and Baseline

**Description:** Preserve the current dirty workspace and available database
state, document restoration, and record the current engineering/runtime health.

**Acceptance criteria:**

- [x] A timestamped source backup preserves tracked and untracked project work
      while excluding secrets, `.git`, dependencies, build output, and backups.
- [x] The tracked working-tree diff is preserved separately as a binary patch.
- [x] Database-backup capability is verified without exposing credentials. A
      complete export is captured when authorized credentials/tools are
      available; otherwise the exact missing access is documented and no
      destructive database task may proceed.
- [x] Baseline lint, tests, build, frontend profile, and available browser
      observations are recorded.
- [x] Restoration instructions name the backup artifacts and validation steps.

**Verification:**

- [x] Backup archive can be listed/tested.
- [x] Backup contains `src`, migrations, configuration, and current untracked
      application files but not `.env.local`.
- [x] `npm run lint`, `npm test`, and `npm run build` results are recorded.
- [x] `git status --short` is unchanged except for intentional plan/backup
      documentation artifacts.

**Dependencies:** None

**Files likely touched:**

- `IMPLEMENTATION_PLAN.md`
- `backups/task-01-baseline-*/`
- `docs/baseline-report.md`
- `.gitignore` only if the backup path is not already excluded

**Estimated scope:** Medium

### Task 2: Add the Characterization Test Harness

**Description:** Add the minimum compatible React component and browser test
tooling required to protect editor and HR flows without replacing existing Node
tests.

**Acceptance criteria:**

- [ ] Existing 13 Node tests still run unchanged.
- [ ] Component tests can render React 19 components with user interactions.
- [ ] Browser tests can start against the Vite application without embedding
      credentials or production data.

**Verification:**

- [ ] One component smoke test passes.
- [ ] One browser smoke test loads the public landing page.
- [ ] Test commands are documented in `package.json` and `README.md`.

**Dependencies:** Task 1

**Files likely touched:**

- `package.json`
- `package-lock.json`
- test configuration
- one smoke test
- `README.md`

**Estimated scope:** Medium

### Task 3: Characterize Current Critical Flows

**Description:** Lock down observable editor behavior before refactoring or
cleaning staff data.

**Acceptance criteria:**

- [ ] Tests cover serialized saves, immediate local backup, recovery decisions,
      and chart switching.
- [ ] Tests cover undo/redo and active-tab-only keyboard shortcuts.
- [ ] Tests cover current vacate/history behavior and preservation of position
      nodes.

**Verification:**

- [ ] Focused tests pass.
- [ ] Existing chart can be opened, edited, saved, and reloaded in a browser.
- [ ] Baseline screenshots and known console/network issues are recorded.

**Dependencies:** Task 2

**Files likely touched:**

- `test/`
- browser test directory
- small testability-only exports if required

**Estimated scope:** Medium

### Checkpoint A: Safe Foundation

- [ ] Source backup and database-backup gate are verified.
- [ ] Current behavior is characterized.
- [ ] No production data has been changed.
- [ ] Human approval is recorded before RBAC work.

## Phase 1 — Authorization and Type Contracts

### Task 4: Add HR Administrator RBAC

**Description:** Add a protected `hr_admin` role, authorization helper, manual
provisioning procedure, and HR-only route guard.

**Acceptance criteria:**

- [ ] Users cannot grant themselves `hr_admin`.
- [ ] The first HR administrator can be assigned manually by user UUID.
- [ ] Organizational administration writes require `hr_admin` in RLS.
- [ ] Frontend guards match database enforcement but are not the security
      boundary.

**Verification:**

- [ ] SQL role-matrix tests cover anonymous, authenticated, chart editor, and
      HR-administrator identities.
- [ ] Direct non-HR database writes are denied.
- [ ] Manual provisioning and removal are documented.

**Dependencies:** Task 3

**Files likely touched:**

- `migration_hr_rbac.sql`
- authorization tests
- `src/App.jsx`
- `src/hooks/useAuth.js`
- `README.md`

**Estimated scope:** Medium

### Task 5: Add Strict TypeScript and Generated Database Types

**Description:** Configure incremental strict TypeScript, generate Supabase
schema types, and add an explicit type-checking gate.

**Acceptance criteria:**

- [ ] JavaScript continues to run during migration.
- [ ] New TypeScript files compile under strict settings.
- [ ] Supabase client uses generated `Database` types.
- [ ] `npm run typecheck` performs `tsc --noEmit` or an equivalent strict check.

**Verification:**

- [ ] `npm run typecheck` passes.
- [ ] Existing lint, tests, and build pass.
- [ ] Vite's current custom build configuration remains intact.

**Dependencies:** Task 4

**Files likely touched:**

- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/types/database.types.ts`
- `src/supabaseClient.ts`
- `package.json`

**Estimated scope:** Medium

### Task 6: Define HR Domain and Runtime Contracts

**Description:** Define typed, validated contracts for staff, job titles,
positions, assignments, skills, profile projections, and chart references.

**Acceptance criteria:**

- [ ] Full HR profiles and masked viewer profiles are distinct return types.
- [ ] Assignment actions use discriminated input types.
- [ ] Chart JSON and local-backup boundaries reject or normalize malformed data.

**Verification:**

- [ ] Contract tests cover valid, missing, duplicate, and malformed inputs.
- [ ] Full National ID cannot appear in a non-HR profile type.
- [ ] Types are documented at their module boundaries.

**Dependencies:** Task 5

**Files likely touched:**

- `src/types/staff.ts`
- `src/types/organization.ts`
- `src/types/chart.ts`
- `src/validation/`
- contract tests

**Estimated scope:** Medium

### Checkpoint B: Secure Typed Foundation

- [ ] RBAC policies are tested directly.
- [ ] Strict type checking passes.
- [ ] Full and masked profile contracts are separated.
- [ ] Human approval is recorded before HR schema changes.

## Phase 2 — Relational HR Model

### Task 7: Migrate the Global Staff Schema

**Description:** Convert staff ownership into GDT-wide HR stewardship and add
the confirmed profile fields without exposing full National ID.

**Acceptance criteria:**

- [ ] Staff includes Khmer/English name, age, gender, employee ID, phone, email,
      address, marital status, education, lifecycle state, and audit fields.
- [ ] Full National ID is stored in an HR-only relation or equivalent protected
      boundary; masked identity is available separately.
- [ ] Employee ID, normalized email, and National ID enforce duplicate rules.
- [ ] Only HR administrators can create/update/archive staff.

**Verification:**

- [ ] Migration is transactional and safely rerunnable where practical.
- [ ] RLS and uniqueness tests pass.
- [ ] No production cleanup is performed by this task.

**Dependencies:** Task 6

**Files likely touched:**

- `migration_staff_directory.sql`
- generated database types
- database tests
- schema documentation

**Estimated scope:** Medium

### Task 8: Add Job Titles and Reporting Hierarchy

**Description:** Replace static job-title assumptions with reusable definitions
and position-to-position reporting.

**Acceptance criteria:**

- [ ] Job titles have stable IDs, names, level/rank, and active state.
- [ ] Positions reference department, office, job title, and optional supervisor
      position by ID.
- [ ] Office must belong to the selected department.
- [ ] Self-reporting, cycles, and invalid hierarchy jumps are rejected.

**Verification:**

- [ ] Tests cover ordinary staff, office leadership, department leadership,
      vacant supervisors, and cycle attempts.
- [ ] Existing position nodes and reporting edges are not deleted.

**Dependencies:** Task 7

**Files likely touched:**

- `migration_job_hierarchy.sql`
- generated database types
- hierarchy validation tests

**Estimated scope:** Medium

### Task 9: Add the Skill and Requirement Model

**Description:** Add reusable skills, temporal staff proficiencies, and
job-title minimum requirements.

**Acceptance criteria:**

- [ ] Proficiency is constrained to levels 1–5.
- [ ] Skill changes retain effective dates/history.
- [ ] Job-title requirements specify a minimum level.
- [ ] Fit evaluation reports met, missing, and below-level requirements.

**Verification:**

- [ ] Database constraints and fit-calculation tests pass.
- [ ] Deactivating a skill does not erase history.

**Dependencies:** Task 8

**Files likely touched:**

- `migration_staff_skills.sql`
- `src/domain/skillFit.ts`
- generated database types
- tests

**Estimated scope:** Medium

### Task 10: Add Atomic Assignment Operations

**Description:** Implement database operations for assign, transfer/promote,
vacate, resign, retire, and suspend.

**Acceptance criteria:**

- [ ] One staff member cannot have two active assignments.
- [ ] One position cannot have two active occupants.
- [ ] Transfer closes and opens assignments atomically.
- [ ] HR administrators and editors of the target chart are authorized.
- [ ] Assignment history remains immutable except for controlled corrections.

**Verification:**

- [ ] Transaction and authorization matrix tests pass.
- [ ] Failed transfers leave the original assignment unchanged.
- [ ] Vacant positions retain their hierarchy and requirements.

**Dependencies:** Task 9

**Files likely touched:**

- `migration_assignment_operations.sql`
- generated database types
- assignment service/types
- database tests

**Estimated scope:** Medium

### Task 11: Produce Dummy-Data Cleanup Dry Run

**Description:** Analyze every chart and relational HR row and produce a
non-mutating cleanup report.

**Acceptance criteria:**

- [ ] Report lists staff, assignments, node occupant fields, skills, and copied
      histories proposed for removal.
- [ ] Report proves node IDs, positions, layout, edges, job titles, departments,
      offices, styling, and organization-node data are preserved.
- [ ] Database and chart JSON backup locations are recorded.

**Verification:**

- [ ] Dry-run row/node counts reconcile with backups.
- [ ] No database rows or chart JSON values are modified.
- [ ] Human approves the exact cleanup targets.

**Dependencies:** Task 10

**Files likely touched:**

- cleanup dry-run script
- cleanup report
- restoration documentation

**Estimated scope:** Medium

### Task 12: Execute Approved Dummy-Data Cleanup

**Description:** Clear only the targets approved in Task 11.

**Acceptance criteria:**

- [ ] Dummy occupants, personal fields, skills, histories, staff rows, and
      assignment rows are removed.
- [ ] Position nodes and genuine organizational-chart data are unchanged.
- [ ] Cleanup is recoverable from the recorded backup.

**Verification:**

- [ ] Before/after structural chart checks match.
- [ ] Node/edge counts and positions are unchanged.
- [ ] Application loads every affected chart without errors.
- [ ] Restore procedure is tested against a safe copy or staging environment.

**Dependencies:** Task 11 and explicit cleanup approval

**Files likely touched:**

- approved cleanup script/migration
- cleanup execution report

**Estimated scope:** Small

### Checkpoint C: HR Data Foundation

- [ ] Staff, hierarchy, skills, and assignments are normalized.
- [ ] Dummy occupants are removed without structural chart loss.
- [ ] Restore path remains available.
- [ ] Human approval is recorded before frontend feature work.

## Phase 3 — Staff Directory and Profile

### Task 13: Add Tailwind Semantic Foundation

**Description:** Introduce Tailwind CSS v4 through the Vite plugin, map existing
GDT semantic tokens, and keep current CSS behavior intact.

**Acceptance criteria:**

- [ ] Existing CSS continues to render unchanged.
- [ ] Light/dark semantic tokens are accessible through Tailwind utilities.
- [ ] React Flow geometry, image export, and custom build settings are unchanged.

**Verification:**

- [ ] Visual before/after screenshots match for representative routes.
- [ ] Browser console and network are clean.
- [ ] Lint, tests, type-check, and build pass.

**Dependencies:** Task 12

**Files likely touched:**

- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `src/index.css`
- theme documentation

**Estimated scope:** Medium

### Task 14: Add Shadcn Dialog Pilot

**Description:** Add only the primitives needed for a centered, focus-managed
dialog and verify integration with the existing theme.

**Acceptance criteria:**

- [ ] Dialog traps focus, closes with Escape, restores trigger focus, and has an
      accessible name and description.
- [ ] Dialog supports light/dark themes, Khmer content, reduced motion, zoom,
      mobile, and desktop layouts.
- [ ] No unrelated component is restyled.

**Verification:**

- [ ] Keyboard-only and accessibility-tree checks pass.
- [ ] Browser screenshots and console checks pass.
- [ ] Automated dialog interaction test passes.

**Dependencies:** Task 13

**Files likely touched:**

- `components.json`
- `src/lib/utils.ts`
- `src/components/ui/dialog.tsx`
- one pilot component/test
- theme tokens

**Estimated scope:** Medium

### Task 15: Add the Staff Directory Read Flow

**Description:** Add an HR-only staff directory route with search, filters,
pagination, loading, empty, error, and retry states.

**Acceptance criteria:**

- [ ] HR administrators can list and search staff.
- [ ] Non-HR users cannot access the directory route or query the underlying
      directory contract.
- [ ] Long Khmer/English names and large result sets remain usable.

**Verification:**

- [ ] Authorization, query, pagination, and state tests pass.
- [ ] Responsive browser checks pass.

**Dependencies:** Task 14

**Files likely touched:**

- `src/pages/StaffDirectoryPage.tsx`
- `src/features/staff/staffApi.ts`
- `src/features/staff/useStaffDirectory.ts`
- route/navigation
- tests

**Estimated scope:** Medium

### Task 16: Add Staff Create/Edit and Duplicate Detection

**Description:** Add HR-only staff creation, editing, archiving, validation, and
duplicate warning.

**Acceptance criteria:**

- [ ] Confirmed personal fields can be created and edited.
- [ ] Duplicate employee ID, National ID, or email shows the existing person's
      position, department, and office.
- [ ] Full National ID is not logged or exposed in generic errors.
- [ ] Staff with history are archived rather than deleted.

**Verification:**

- [ ] Form, boundary-validation, duplicate, and authorization tests pass.
- [ ] Slow/failure responses preserve entered form data.
- [ ] Browser keyboard and error-association checks pass.

**Dependencies:** Task 15

**Files likely touched:**

- `src/features/staff/StaffForm.tsx`
- staff API/hook
- staff page
- tests

**Estimated scope:** Medium

### Task 17: Add the Staff Profile Dialog

**Description:** Replace the current drawer behavior with a centered profile
dialog opened by an explicit action.

**Acceptance criteria:**

- [ ] Dialog displays current profile, current assignment, skills, fit summary,
      and complete previous assignment history.
- [ ] Non-HR users see masked National ID; HR sees the full value.
- [ ] Public and uninvited users cannot call the profile contract.
- [ ] Opening a node by ordinary left-click does not open the dialog.

**Verification:**

- [ ] Profile projection and permission tests pass.
- [ ] Dialog accessibility and responsive checks pass.
- [ ] Browser network inspection confirms full National ID is absent for
      non-HR users.

**Dependencies:** Task 16

**Files likely touched:**

- `src/features/staff/StaffProfileDialog.tsx`
- `src/components/ProfileDrawer.jsx` removal/refactor
- profile API/hook
- tests

**Estimated scope:** Medium

### Task 18: Add Staff Skills Management

**Description:** Allow HR administrators to manage staff skill proficiency and
view its history.

**Acceptance criteria:**

- [ ] HR can add, change, and deactivate staff skills.
- [ ] Level definitions are visible and consistent.
- [ ] Historical changes remain readable.

**Verification:**

- [ ] Skill mutation/history tests pass.
- [ ] Keyboard and responsive form checks pass.

**Dependencies:** Task 17

**Files likely touched:**

- `src/features/staff/StaffSkillsEditor.tsx`
- skill API/hook
- profile dialog
- tests

**Estimated scope:** Medium

### Task 19: Add Job-Title Requirements Management

**Description:** Allow HR administrators to manage minimum skill requirements
for each reusable job title.

**Acceptance criteria:**

- [ ] HR can add/remove requirements and change minimum levels.
- [ ] Existing staff fit results update from the same shared calculation.
- [ ] Deactivated requirements do not erase historical assignments.

**Verification:**

- [ ] Requirement and fit tests pass.
- [ ] Browser interaction/accessibility checks pass.

**Dependencies:** Task 18

**Files likely touched:**

- `src/features/jobTitles/JobRequirementsEditor.tsx`
- job-title API/hook
- tests

**Estimated scope:** Medium

### Checkpoint D: Staff Directory Complete

- [ ] HR-only CRUD works.
- [ ] Profile masking is enforced by data contracts.
- [ ] Skills and requirements work end to end.
- [ ] Human approval is recorded before chart assignment integration.

## Phase 4 — Chart Assignment and History

### Task 20: Modularize the Properties Panel

**Description:** Extract existing node, edge, visual, hierarchy, and assignment
responsibilities into typed components without changing behavior.

**Acceptance criteria:**

- [ ] Existing node/edge editing behavior is unchanged.
- [ ] Staff personal fields are no longer treated as node-owned form state.
- [ ] Component contracts are typed and focused.

**Verification:**

- [ ] Characterization and component tests pass.
- [ ] Before/after browser screenshots and editor interactions match.

**Dependencies:** Task 19

**Files likely touched:**

- `src/components/PropertiesPanel.tsx`
- `src/components/properties/`
- tests

**Estimated scope:** Medium per extracted slice; execute as separate subtask if
the final file count exceeds five.

### Task 21: Add Hierarchical Position Editing

**Description:** Edit job title, department, office, and reporting position with
Option B hierarchy filtering.

**Acceptance criteria:**

- [ ] Department filters offices.
- [ ] Job level and organizational hierarchy filter supervisor positions.
- [ ] Vacant supervisor positions remain selectable/displayable.
- [ ] Invalid/cyclic reporting relationships are explained and rejected.

**Verification:**

- [ ] Hierarchy UI and database-validation tests pass.
- [ ] Browser checks cover ordinary staff and leadership positions.

**Dependencies:** Task 20

**Files likely touched:**

- position properties component
- hierarchy picker
- position API/hook
- tests

**Estimated scope:** Medium

### Task 22: Add Staff Picker and Assignment

**Description:** Replace node personal-data entry with search, filtered staff
selection, availability, fit review, and assignment confirmation.

**Acceptance criteria:**

- [ ] Editor can search the shared directory for an editable chart.
- [ ] Already-assigned staff cannot be assigned again.
- [ ] Candidate view shows department/office, availability, and skill fit.
- [ ] Confirming uses the atomic assignment operation.

**Verification:**

- [ ] Permission, availability, fit, and assignment tests pass.
- [ ] Failed assignment leaves chart and database state unchanged.
- [ ] Browser flow and network payload checks pass.

**Dependencies:** Task 21

**Files likely touched:**

- `src/features/assignments/StaffPicker.tsx`
- assignment API/hook
- position properties component
- tests

**Estimated scope:** Medium

### Task 23: Add Transfer, Promotion, and Vacancy Flow

**Description:** Add explicit transactional departure and movement workflows.

**Acceptance criteria:**

- [ ] Editor/HR can transfer, promote, retire, resign, suspend, or vacate.
- [ ] Effective date, reason, and notes are recorded.
- [ ] Transfer/promotion closes the previous assignment and opens the new one
      atomically.
- [ ] Position nodes remain in place when vacant.

**Verification:**

- [ ] Transaction failure/rollback tests pass.
- [ ] History and vacancy browser flows pass.
- [ ] Chart structure remains unchanged after occupant movement.

**Dependencies:** Task 22

**Files likely touched:**

- assignment action dialog
- assignment API/hook
- node/position components
- tests

**Estimated scope:** Medium

### Task 24: Add Context-Menu Profile Access

**Description:** Add right-click → View Details for current and historical staff
while preserving ordinary node selection.

**Acceptance criteria:**

- [ ] Current occupant profile opens from the context menu.
- [ ] Historical names open the current profile with complete history.
- [ ] Public/uninvited users do not receive the action or profile data.
- [ ] Keyboard users have an equivalent accessible action.

**Verification:**

- [ ] Context-menu, permission, focus, and history tests pass.
- [ ] Browser context-menu and keyboard flows pass.

**Dependencies:** Task 23

**Files likely touched:**

- `src/components/ContextMenu.tsx`
- chart/profile integration
- history list
- tests

**Estimated scope:** Medium

### Checkpoint E: Chart HR Integration Complete

- [ ] Staff assignment replaces personal-data entry.
- [ ] Hierarchical reporting works.
- [ ] Transfers and vacancies preserve chart structure.
- [ ] Profiles and history obey invitation and masking rules.
- [ ] Human approval is recorded before general refactoring.

## Phase 5 — Editor Refactoring

### Task 25: Extract Chart History

**Description:** Move undo/redo snapshot ownership into a typed
`useChartHistory` hook without behavior changes.

**Acceptance criteria:**

- [ ] Snapshot limit and ordering are preserved.
- [ ] Undo/redo behavior and callback stability are preserved.

**Verification:** Focused tests, lint, type-check, build, browser shortcuts.

**Dependencies:** Task 24

**Files likely touched:** `src/hooks/useChartHistory.ts`, `src/App.jsx`, tests

**Estimated scope:** Small

### Task 26: Extract Chart Shortcuts

**Description:** Move document keyboard handling into a typed
`useChartShortcuts` hook.

**Acceptance criteria:**

- [ ] Only the active mounted chart responds.
- [ ] Input/contenteditable exclusions and Escape behavior remain correct.
- [ ] All current shortcuts remain available.

**Verification:** Focused tests, lint, type-check, build, browser keyboard test.

**Dependencies:** Task 25

**Files likely touched:** `src/hooks/useChartShortcuts.ts`, `src/App.jsx`, tests

**Estimated scope:** Small

### Task 27: Extract Chart Persistence

**Description:** Move serialized cloud saving, local backup, recovery,
five-minute safety save, versions, and thumbnail coordination behind typed
contracts.

**Acceptance criteria:**

- [ ] Older requests cannot overwrite newer edits.
- [ ] Immediate local backup and recovery behavior are preserved.
- [ ] Destructive-save guard, version throttle, and thumbnail throttle remain.
- [ ] Save failures are surfaced without losing the local backup.

**Verification:** Persistence characterization tests, lint, type-check, build,
and browser save/reload/recovery checks.

**Dependencies:** Task 26

**Files likely touched:** persistence hook/service modules, `src/App.jsx`, tests

**Estimated scope:** Medium; split coordinator, recovery, and thumbnails into
separate tasks if more than five files are required.

### Checkpoint F: Editor Modularization

- [ ] App-level behavior remains unchanged.
- [ ] Critical hooks have focused tests and typed contracts.
- [ ] Human approval is recorded before broad styling migration.

## Phase 6 — Incremental UI/CSS Migration

Each surface below is a separate task and must remove old CSS only after visual,
responsive, accessibility, and behavior verification.

### Task 28: Migrate Staff and HR Administration Surfaces

**Dependencies:** Task 27

**Acceptance criteria:** Staff directory, forms, skills, requirements, profile,
and assignment dialogs use shared accessible primitives and semantic tokens.

### Task 29: Migrate Dashboard and Navigation Surfaces

**Dependencies:** Task 28

**Acceptance criteria:** Dashboard, folders, chart cards, navigation, menus, and
responsive layouts preserve behavior and GDT identity.

### Task 30: Migrate Authentication and Account Surfaces

**Dependencies:** Task 29

**Acceptance criteria:** Login, registration, verification, recovery, and
account profile preserve validation, focus, and error behavior.

### Task 31: Migrate Chart Chrome and Remaining Dialogs

**Dependencies:** Task 30

**Acceptance criteria:** Toolbar, status bar, tabs, properties, sharing, move,
confirmation, shortcuts, search, and version history are migrated without
changing canvas geometry or export output.

### Task 32: Audit and Reduce Legacy CSS

**Dependencies:** Task 31

**Acceptance criteria:**

- [ ] Only verified unused rules are removed.
- [ ] React Flow geometry/export-specific CSS remains where needed.
- [ ] No duplicated token system or scattered literal colors are introduced.
- [ ] Light/dark, Khmer, responsive, zoom, and reduced-motion checks pass.

### Checkpoint G: UI Modernization Complete

- [ ] Every migrated surface has before/after evidence.
- [ ] Browser console and network are clean.
- [ ] Keyboard, focus, contrast, and accessibility-tree checks pass.
- [ ] No unverified bulk deletion of `index.css` occurred.

## Phase 7 — Release Verification and Documentation

### Task 33: Security and Dependency Audit

**Acceptance criteria:**

- [ ] Authorization matrix passes against direct database/API calls.
- [ ] Full National ID is absent from public, viewer, editor, chart JSON,
      logs, errors, and browser network responses.
- [ ] No critical/high reachable dependency vulnerability remains.
- [ ] Security headers and production environment guidance are documented.

### Task 34: End-to-End and Performance Verification

**Acceptance criteria:**

- [ ] Staff CRUD, duplicates, skills, requirements, assignment, transfer,
      vacancy, profile, history, chart save/recovery, sharing, and export pass.
- [ ] Large-chart and staff-directory performance is measured.
- [ ] Mobile, desktop, zoom, Khmer, light/dark, and reduced motion pass.

### Task 35: Deployment, Backup, and Rollback Documentation

**Acceptance criteria:**

- [ ] Migration order, HR-admin provisioning, backup, restore, rollback, and
      deployment steps are reproducible.
- [ ] Generated database types match the released schema.
- [ ] README and operational documentation match actual behavior.

### Final Checkpoint

- [ ] All task acceptance criteria are complete.
- [ ] Lint, tests, type-check, and build pass.
- [ ] Database migrations are backed up and reversible where possible.
- [ ] No private staff data is exposed to unauthorized users.
- [ ] Production deployment requires explicit human approval.

## Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Dummy cleanup removes real chart structure | High | Backup, dry run, structural hashes/counts, explicit approval |
| Full National ID leaks through broad row access | High | Separate protected storage/projection; network/RLS tests |
| Transfer leaves two or zero assignments | High | One transactional DB operation and partial unique indexes |
| Chart JSON and relational HR diverge | High | Relational source of truth; references only; contract tests |
| Reporting cycles or invalid supervisors | High | Position-level hierarchy validation and cycle checks |
| TypeScript migration creates a large unstable diff | Medium | New files first; one module per task; explicit typecheck |
| Tailwind/Shadcn causes visual regression | Medium | Token bridge, coexistence, one surface at a time, screenshots |
| Existing dirty work is overwritten | High | Task 1 source archive and patch; no reset/checkout |
| Production DB cannot be fully backed up with current credentials | High | Block destructive tasks until authorized export access exists |

## Deferred Work

- HR-controlled account creation and verification.
- Employee self-service profile editing.
- Automatic promotion decisions; this project only records and compares skills.
- Production deployment until all release gates and human approval are complete.
