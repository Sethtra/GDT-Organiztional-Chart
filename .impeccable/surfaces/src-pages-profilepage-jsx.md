---
version: 1
slug: "src-pages-profilepage-jsx"
primary_target: "src/pages/ProfilePage.jsx"
related_targets: ["src/styles/account-record.css","src/hooks/useAuth.js"]
---

## Scope and mode

Account Settings (`/profile`). **Operate** — the visitor came to change one
thing about their account and leave. Expression lives in the composition and
the edge detail; it never gets between the user and the field.

## Audience and task

A signed-in GDT staff member — chart owner, invited collaborator, or HR
administrator. Visited rarely: set a display name and photo once, change a
password, sign out a lost device. Nothing here is a daily task, so the page
optimises for *finding the right control immediately*, not for throughput.

## Content

Real account state only — display name, avatar, email + its verification flag,
the account ref (the real user id, shortened). No role/tenure/created-date
panel: it was offered and declined, and inventing it would have put facts on
screen the page does not own.

## Direction

**The filed personnel record.** Candidate 7 of 7 on the grounded structure list
(seed `a5845ebe`, surface/operate) — the least immediately-recognisable-as-
settings option, and the one that stopped the page being another card stack.
One sheet under an emerald letterhead; registers, ruled rows, endorsement
strips. The memorable moment is the letterhead: seal impressed on a white disc,
gold rule drawing across as the sheet settles.

Details live in DESIGN.md's "The account record" section, not here.

## Constraints honoured

- Danger Zone copy is verbatim from the previous build — a factual statement
  about a missing server-side deletion function, not marketing text to rewrite.
- Google-only accounts get a stated "managed by your Google account" row rather
  than a password form that would silently mint a password.
- `signOut` gained an options passthrough (`{ scope: 'global' }`); existing
  callers pass nothing and keep local-only behaviour.

## Unresolved

- Reviewed through a temporary stub-auth harness, not a live Supabase session.
  Sign-out-everywhere and the password change were exercised as UI states; the
  real Supabase round-trips are unverified against a live project.
- The shared `Navbar` still overflows its own actions at ~390px. Pre-existing,
  not introduced here, and out of this surface's scope.
