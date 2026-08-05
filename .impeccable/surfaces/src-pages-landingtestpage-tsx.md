---
version: 1
slug: "src-pages-landingtestpage-tsx"
primary_target: "src/pages/LandingTestPage.tsx"
related_targets: ["src/pages/LandingTestPage.css","src/styles/pa-theme.css"]
---

# Test landing surface brief

- Scope: isolated `/test-landing` preview; Persuade mode, with an Operate register for the signed-in state. The live landing (`/`) is a separate component (`LandingCivicPage`) and must not be restyled or rerouted from here.
- Audience and job: public visitors should recognize the official GDT product and understand how to obtain access; signed-in officers should reach their own charts first. HR administration is deliberately not an audience for this page.
- Admin access rule (user-set, 2026-08-04): the ONLY route to the admin dashboard is the "Admin portal" item inside the profile dropdown, rendered only when `useHrAdmin()` resolves true. No staff-directory, org-structure or job-architecture links anywhere on the page, and no locked/teaser admin links for non-admins.
- Proof and content: the real Department → Office → Position model, the visitor's own chart rows from `useChart()`, and the four access tiers the database enforces. No personnel data, no invented counts, no marketing claims.
- Direction: "Register" — the department's structure presented as an official ruled record. Numbered articles, hairline rules, brass index numerals, tabular figures, a table for the officer's own entries. Refuses hero-plus-feature-cards.
- Visual world: inherited wholesale from the admin design system (`src/styles/pa-theme.css`, `--pa-*`). Light only — no theme toggle, unlike the civic landing. Moul is reserved for the single Khmer display line.
- Memorable moment: the deep-green article band (`#0b2b20`, the admin sidebar's own field) carrying the three structural levels as numbered clauses under one brass-ticked rule.
- Responsive behavior: hero 7/5 split collapses to stacked; the entries table becomes ruled cards below `sm`; the article band becomes a vertical numbered sequence; the masthead drops the English wordmark line rather than truncating it.
- States handled: session loading, chart loading (skeletons), empty register, sign-out failure. `useChart` never clears `loading` without a session, so the skeletons are gated on `user` rather than on the hook's flag.
- Unresolved decisions: `useChart` swallows fetch errors, so a failed load is indistinguishable from an empty register; the empty state is written to be honest in both cases. Production adoption remains a separate user decision.
