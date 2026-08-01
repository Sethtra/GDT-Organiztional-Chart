# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **HR administrators** — GDT-wide authority. Create and maintain the staff
  directory, skills catalog, job architecture, and organizational reference
  data (departments/offices) across the whole department, not just one chart.
- **Chart owners** — GDT staff/units who create and control their own
  organizational chart(s): layout, invitations, and staff-to-position
  assignment within that chart.
- **Invited viewers/editors** — accepted collaborators on a specific chart.
  Editors may assign, transfer, or vacate staff; viewers may view the chart
  and permitted profiles. Both see a masked National ID.
- **Public visitors** — unauthenticated. See only safe chart display data;
  cannot open staff profiles.

## Product Purpose

Digitize the General Department of Taxation's organizational structure and
personnel management: chart owners build and maintain visual org charts for
their part of the department, while HR administrators maintain one GDT-wide
staff directory (positions, skills, assignment history) that charts reference
live rather than duplicate. Success means real GDT staff using this in
production to run the actual organization. The project is heading toward that
production rollout — currently blocked only by the database-backup gate
described in `docs/database-rollout.md` — and the staff directory now holds
real GDT personnel records (the dummy seed data noted in
`IMPLEMENTATION_PLAN.md` has been superseded).

## Positioning

Built specifically for GDT — a single-organization internal tool, not a
generic multi-tenant org-chart SaaS product. Its distinguishing mechanism:
charts and the HR staff directory are architecturally separate. Chart JSON
never stores sensitive personal fields; profile data loads live through
authorized, permission-checked queries. That separation is what lets the same
chart be shared at different privacy tiers — public, invited viewer (masked
National ID), invited editor, HR administrator (full record) — without the
chart artifact itself ever leaking private data.

## Operating Context

- Government agency (អគ្គនាយកដ្ឋានពន្ធដារ — General Department of Taxation,
  Cambodia). Bilingual Khmer/English UI; Khmer is the primary language for
  staff-facing data (names, education levels, position titles).
- Supabase-backed. Row-level security and permission-aware RPCs are the real
  enforcement boundary; frontend route guards exist for user experience, not
  as the security mechanism.
- The HR administrator role is provisioned manually by a Supabase project
  administrator (`docs/hr-admin-provisioning.md`) — deliberately not
  self-service, and never assigned via a migration or hardcoded email.
- Risk is gated behind feature flags: `VITE_HR_FEATURES_ENABLED` and
  `VITE_CHART_VERSION_WRITES_ENABLED` default off until their respective
  RLS/migrations are verified per environment.
- Database rollout is a separate, deliberately gated process (full verified
  backup required first) from ordinary local development.

## Capabilities and Constraints

- Drag-and-drop chart editing, automatic layout, undo/redo, search, export,
  and version history.
- Owner-controlled chart invitations (view or edit access); a chart has
  exactly one owner.
- Public read-only chart links backed by privacy-safe server-side
  projections.
- GDT-wide staff directory: one active position per person, one active
  occupant per position, department → office → reporting-position hierarchy.
- Position history (joined date, left date, reason) and skill proficiency
  levels 1–5, with job-title-level minimum skill requirements.
- Profile data only opens via right-click → "View Details" — never via a
  normal node click. This is deliberate friction to avoid accidental PII
  exposure while browsing a chart.
- Full National ID is stored separately (`staff_sensitive`) and shown only to
  HR administrators; invited viewers/editors see it masked.
- Local-first save/recovery: immediate browser-storage copy, debounced
  serialized cloud saves, a safety version every five minutes, and
  downloadable/restorable JSON chart backups.
- Constraint: chart JSON must never carry phone, email, address, National ID,
  education, skills, or history — only safe occupant labels/IDs.
- Constraint: holding the HR administrator role does not, on its own, grant
  access to another owner's chart.

## Brand Commitments

- Identity: អគ្គនាយកដ្ឋានពន្ធដារ (GDT) — General Department of Taxation. The
  official GDT seal is used in admin branding (sidebar, login).
- Bilingual Khmer + English throughout; Khmer appears first wherever both
  languages are shown together.
- Admin design system: green primary (`#136232`) with gold accent, white
  surfaces. Manrope for Latin text, Noto Sans Khmer for Khmer body text, and
  Khmer OS Muol (web equivalent: Google Fonts "Moul") reserved for decorative
  Khmer display headings.

## Evidence on Hand

- Real GDT personnel records now populate the staff directory (officer
  names, positions, departments, employee IDs) — production data, not the
  dummy data referenced in `IMPLEMENTATION_PLAN.md`.
- Real organizational structure (departments/offices) and job architecture
  (job titles, skill catalog, requirements) are already populated.
- No fabricated testimonials, pricing, or marketing claims exist or are
  needed — this is an internal operational tool, not a marketed product.

## Product Principles

1. Privacy by architecture, not by convention — sensitive data is
   structurally kept out of chart JSON and gated behind permission-checked
   queries, never just hidden in the UI.
2. Postgres RLS is the real security boundary; frontend guards are UX, never
   the enforcement point.
3. Manual, auditable provisioning over self-service convenience for anything
   security-sensitive (first HR admin, role grants).
4. Local-first resilience — an edit should never be lost to a network blip;
   cloud sync and safety versions are a backstop, not the primary save path.
5. Bilingual by default, Khmer-first — GDT staff-facing content defaults to
   Khmer with English as the supporting language.
