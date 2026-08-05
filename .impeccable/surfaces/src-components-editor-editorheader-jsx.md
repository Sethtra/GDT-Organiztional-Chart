---
version: 1
slug: "src-components-editor-editorheader-jsx"
primary_target: "src/components/editor/EditorHeader.jsx"
related_targets: ["src/styles/chart-editor.css","src/components/OrgNode.jsx","src/components/CustomEdge.jsx","src/utils/floatingEdge.js","src/pages/ChartEditorTestPage.jsx","src/utils/nodeAlignment.js","src/components/editor/AlignmentGuides.jsx","src/hooks/useNodeOperations.js","src/components/properties/NodePropertiesPanel.jsx"]
---

# Chart Editor surface brief

- Scope: the Chart Editor surface (`/chart/:id`) — command bar, canvas, unit and
  person nodes, connectors, controls, minimap, status bar, tab bar.
- Visitor mode: **Operate**. Officers and chart owners come to read and change a
  structure. Expression must never obscure the task or a familiar affordance.
- Palette: GDT emerald `#136232` + white, per PRODUCT.md. Gold is the seal and
  the search hit only; red is destructive actions only. See DESIGN.md.
- Canvas: one faint dot grid for scale. Movement is free — position snaps
  onto the grid or a sibling's edge/centre only within tolerance while
  dragging, never unconditionally. See DESIGN.md's Canvas section.

## Rejected, with reasons — do not reintroduce

- **Derived rank/tier.** A build that inferred a level (អគ្គនាយកដ្ឋាន /
  នាយកដ្ឋាន / ការិយាល័យ) from the unit's name and its graph depth, and drew each
  level at a different fixed width. Rejected by the user: it guesses at a
  hierarchy nobody declared, and the per-tier `min-width` made nodes
  un-resizable. Every unit node is now one card whose colour and size are the
  author's.
- **Achromatic "notation" palette** (black ink, hatch/stipple fills on paper).
  Rejected: GDT's colours are green and white, and a brand commitment in
  PRODUCT.md outranks any visual direction.
- **Ruled score-paper background.** Rejected as too busy for a government tool.
- **Unconditional grid snap.** `snapToGrid`/`snapGrid` on `<ReactFlow>` — every
  drag rounded to the nearest 20px multiple no matter where the pointer was.
  Replaced by threshold-gated grid+alignment guides (see "New feature"
  below); do not re-add the bare props, it silently forecloses alignment
  with any sibling whose centre isn't itself a 20px multiple.

## Constraints held fixed

- Toolbar stays at the top with its existing action set and order — the
  header/node visual refresh below restyled chrome, it did not add, remove,
  or reorder a single toolbar action.
- Person-node geometry is load-bearing — the 84px avatar at `-42px` and the
  team pill at `-13px` are where `floatingEdge.js` aims connector endpoints.
- Profile data still opens only via right-click → View Details.
- No chart-JSON schema change and no migration.

## Fixed after the first user review

- **Connectors landed off-centre.** `getNodeRect` clamped a measured width up
  to an assumed CSS minimum (160 / 220), moving the computed side-centre half
  the difference off the visible handle — and the error changed size whenever
  the CSS min-width was edited. Measurements are now used verbatim. Guarded by
  `test/connectorAnchor.test.ts`.
- **The selection frame rendered sky blue.** `NodeResizer` was tinted with
  `badgeAccent`, whose properties-panel default is `#38bdf8`. Now brand green
  with small square handles.
- **Unlabelled nodes printed a literal "ORG NODE"** fallback in the band. An
  empty `badgeText` now renders no label at all.
- **Khmer text stacked vertically.** `word-break: break-word` is the legacy
  alias for `overflow-wrap: anywhere` and splits a base consonant from its
  subscript and vowel signs. Now `word-break: normal` plus
  `overflow-wrap: break-word`.

## Fixed after the second user review (resize/connector desync)

- **Resize handles visibly detached from the shape; connectors "broke" on
  any node not left at its default size.** One root cause: `.org-node` /
  `.org-node--person` never filled the `.react-flow__node` wrapper that
  `NodeResizer` actually resizes and that `floatingEdge.js` measures
  (`node.measured.width/height`). Dragging a handle grew the wrapper while
  the card stayed at min-content size — handles tracked the wrapper, the
  connector math trusted the wrapper, and only the visible card was left
  behind. Fix: `position: relative; width: 100%; height: 100%;` on both
  card classes. No change was needed in `floatingEdge.js` — it already
  trusted `node.measured`, it was just measuring the wrong box. Full detail
  and the "why both symptoms share one cause" reasoning is in DESIGN.md's
  Nodes section.

## Redesign pass (header + nodes, admin-dashboard-aligned)

Restyle only — no new/removed/reordered toolbar actions, no chart-JSON
change. Brought this surface's chrome closer to the admin dashboard's already
-shipped `--pa-*` system (`src/pages/AdminDashboardTestPage.css`,
`AdminHeader.tsx`) without adopting its Tailwind-in-JSX methodology: values
and patterns were translated into this surface's existing hand-written
`--nx-*` token system instead of a rewrite.

- `--nx-radius` raised 4px → 8px, shared by chrome, controls, and nodes —
  one rounding language, matching the admin dashboard's `rounded-lg` /
  `rounded-[14px]` card family.
- `--nx-shadow` / `--nx-shadow-lift` widened to a soft, large-blur ambient
  layer (adapted from the admin dashboard's `--pa-shadow` formula) instead
  of the old tight, close blur — this, not a colour or border change, is
  what fixed the "nodes are barely visible on light theme" complaint.
- New `--nx-header-shadow` gives the command bar a soft lift beneath its
  existing green underline.
- `.save-badge` rebuilt as a soft-tinted pill (new `--nx-gold-tint` /
  `--nx-gold-border` tokens for "Saving", reusing `--nx-green-tint` /
  `--nx-green` for "Saved") instead of bare coloured text.
- Focus rings switched from a solid 2px green outline to a soft
  translucent ring (`3px solid rgba(19,98,50,.28)`), matching the admin
  dashboard's `pa-focus-ring`.
- Header height 52px → 56px, toolbar buttons 30px → 32px, seal 30px → 32px
  — proportional bump, not a layout rework.
- Both card classes gained a 1px hover lift paired with the stronger shadow.

## Fixed after the third user review (live in `/test-chart-editor`)

Both found by the user actually clicking around the new test route — the
kind of thing static render / unit tests can't catch.

- **Resize grip and connect-handle dot overlapped into one illegible mark.**
  `.react-flow__resize-control.line::after` (the decorative mid-edge resize
  pill) and `.flow-handle` (the `<Handle>` connect dot) were both centred at
  the exact same point — the edge midpoint — so selecting a node drew two
  different green-bordered white shapes on top of each other. First fix:
  pushed the pill 9px outside the border, past the dot. This stopped the
  overlap but was itself wrong per the next review — see "Fixed after the
  fourth user review".
- **A parent→child connector looked crooked / off-centre.** Diagnosed, not
  assumed: `layoutUtils.js`'s `getLayoutedElements` (Dagre) already centres
  every node from its real `node.measured.width/height`, and this route's
  "Auto Layout" button had been left calling a no-op stub — so what the user
  saw was fixture nodes hand-placed without ever running the real centring
  algorithm, not a defect in it. Wired the actual `getLayoutedElements` into
  the test page's Auto Layout button to confirm: running it straightens the
  line immediately. No connector or layout code changed — the fix here was
  making the test route exercise the real algorithm instead of a stub.

## New feature: smart alignment guides (Figma/Visio-style)

User's original ask, from the reference screenshot: Visio's "dynamic glue"
snaps a dragged shape's centre onto another shape's centre and shows a
dashed guide the moment they line up — regardless of either shape's size —
and movement is otherwise free, not locked to a grid.

Built as one unified candidate system, not guides layered on top of the
existing unconditional grid snap:

- `src/utils/nodeAlignment.js` — `getNodeAlignmentGuides(draggedRect,
  otherRects, threshold, gridSize)`. Compares the dragged node's
  left/centreX/right and top/centreY/bottom against the same six lines of
  every other node, *and* against the nearest grid multiple, as one pool;
  closest match within `threshold` wins per axis.
- `src/components/editor/AlignmentGuides.jsx` — renders the matched line(s)
  full-span via `ViewportPortal` (React Flow's own mechanism for
  flow-space-coordinate overlays that pan/zoom with the canvas).
- Wired into both `FlowApp.jsx` (production) and `ChartEditorTestPage.jsx`
  (fixtures) via `onNodeDrag` (live feedback) and `onNodeDragStop` (final
  position — see below for why both).
- New token `--nx-guide` (magenta, `#c81f8f` light / `#ff5fc4` dark) —
  deliberately not brand green, so the guide reads as a distinct temporary
  signal rather than more chrome.
- `snapToGrid`/`snapGrid` props removed from both `<ReactFlow>` instances —
  see "Rejected" above for why the unconditional version had to go, not
  just gain a companion.

Two bugs found and fixed while building this, both the kind that only show
up when the interaction is actually driven, not read:

1. **`onNodeDrag`-only snapping left the final dropped position unsnapped.**
   React Flow's drag-end doesn't fire another `onNodeDrag` before
   `onNodeDragStop` — a version that only applied the snap in the former
   had every guide line correctly positioned during the drag and then let
   the pointer's raw release position stick regardless. Fix: the same
   `applyAlignmentSnap` runs from both handlers.
2. **A Playwright-driven test drag consistently landed ~10–15px short of
   its intended target** — enough to look like the snap wasn't engaging.
   Root cause was in the test, not the feature: confirmed by reading
   `node.position` directly (see DESIGN.md's browser-verification section
   for the technique) that React Flow's drag doesn't track movement from
   the very first mousemove after mousedown — that event arms the drag
   without counting as movement. A tiny warm-up move before the real one
   fixed tracking to ~1% accuracy. Documented in DESIGN.md so the next
   drag test in this repo doesn't rediscover it from scratch.

## Fixed after the fourth user review (resize grip vs. connect anchor)

- **Pushing the resize grip outside the border (third review's fix) solved
  the overlap but lost the distinction the shapes are supposed to carry.**
  User's framing: the resize *handle* belongs to the shape, so it should
  read as inside it; the connect *anchor* is what a new connector drags out
  from, so it should read as outside, with a small gap. Fix: the grip's
  decorative pill now sits 4px inside the border (`.react-flow__resize-
  control.line.{top,bottom,left,right}::after`); the connect-handle dot now
  sits 7px outside it via new `.react-flow__handle-{top,bottom,left,
  right}.flow-handle` rules (React Flow's own default centres the dot ON
  the border, half in/half out — these override that per side). Verified
  by measuring rendered element positions directly rather than judging a
  screenshot by eye: at 9px handle size, "inside" and "outside" are only a
  few px apart. Person cards' avatar-offset top/bottom win via a more
  specific selector, so this reaches unit nodes' four sides and a person
  card's left/right only.

## Verified

Contrast in both themes (text ≥4.5:1, borders and strokes ≥3:1),
stacked-connector equality by pixel sample, 47 node tests, 77 vitest tests,
typecheck, design detector clean across every changed file. The new gold
pill tokens took two iterations — the first pale tint/border pair looked
right and measured under threshold (4.34:1 text, 1.35:1 border); see
DESIGN.md's Palette section for the passing values and the lesson.

The resize-sync fix, the redesign, and the alignment-guide feature were
all exercised live in a Chromium browser via `/test-chart-editor`, not
just unit-tested: resize a pre-resized node and confirm card/handles/
connector stay in sync; drag a node toward a sibling and confirm the guide
renders and the drop lands pixel-exact on the matched line (confirmed by
reading flow-space `node.position` directly, not inferred from screen
pixels). The quick-add directional buttons were built and verified the
same way (all four directions, both node types, both themes) before being
fully reverted two reviews later — see below. Both themes screenshotted
throughout. The grip/anchor relationship was confirmed the same way at
every stage — rendered element positions read directly, not judged from a
screenshot — since a few px at 9px handle scale is easy to misjudge by eye;
its final state (grip on the border, anchor 7px past it) was reconfirmed
live after the quick-add reversion, not assumed unchanged.

Re-run after the fifth review's wiring and bug fixes: 77 vitest tests /
47 node tests still pass unchanged, design detector clean on both touched
files (`ChartEditorTestPage.jsx`, `NodePropertiesPanel.jsx`). Functional
parity itself was verified the same live-browser way as everything else
on this surface, not by adding new unit tests for it — see "Fixed after
the fifth user review" above for exactly what was driven.

## Tried and reverted: quick-add directional buttons — do not rebuild unasked

User's reference: a selected shape with a magenta selection border and
circle-with-arrow buttons floating just outside it (Miro/Whimsical/
Lucidchart's "click to add a connected shape in this direction" pattern),
plus a report that some nodes render with no visible anchor at all.

Built as a real, scoped feature (confirmed with the user rather than
assumed): click an arrow on a selected node → a new node is created in
that direction and connected by an edge, generalizing "Add Child Node"
across all four sides via `addDirectionalNode`. `top`/`left` reversed the
edge direction (new node becomes the source's parent) so the connector
kept reading top-to-bottom regardless of which side it grew from. Shipped,
verified live in both themes on both node types — then removed across two
reviews: bottom first ("remove this arrow" against a screenshot of it),
the rest next ("no remove it completely"), with the reasoning stated
directly this time — the user wants to pull the connect anchor and drag it
to an existing node themselves, i.e. the manual drag-to-connect the anchor
dot already exists for is the preferred mechanism, not auto-create. Fully
removed: `addDirectionalNode` out of `useNodeOperations.js`, `FlowApp.jsx`,
and `ChartEditorTestPage.jsx`; `DirectionalAddButtons` and its now-unused
icon imports out of `OrgNode.jsx`; `.org-node__add-btn*` out of
`chart-editor.css`, base rule and the person-card top override alike.

The "missing anchor" report that prompted this turned out to be existing,
correct behavior, not a regression, and stays true now that quick-add is
gone: an officer-type person node (a leaf with no subordinates) only ever
rendered a top connect Handle — bottom/left/right are conditionally
excluded in `OrgNode.jsx` (`data.type !== 'officer'`). Confirmed by
checking every fixture node type's rendered handle count live; nothing
else was missing any of its four.

Two CSS changes made *for* the buttons were kept rather than reverted:
`.org-node`'s `overflow: hidden` → `visible`, and `.org-node__band`
carrying its own top-corner radius instead of depending on that overflow
to clip it. Both are harmless with the buttons gone (verified — no corner
or content-overflow regression), and reverting `overflow` back to `hidden`
risked clipping the connect-handle anchor, which sits outside the card's
own box at rest (see below) for reasons unrelated to the buttons. Left in
place deliberately, not an oversight.

If a future request asks for something in this shape again, read this
whole entry first — the "why not" is a stated user preference (manual
drag-to-connect over auto-create), not an unfinished feature.

## Node template redesign: the two "official" shapes

User's framing: not a bug fix, a request to see the deliberate, finished
design for the two node kinds this surface has — a fully-custom unit node
and a fixed-format person/position node (photo, name, title). No
reference image this round; the brief was to bring real design judgement,
not match a screenshot.

Assessed both with fresh eyes before touching anything: functionally
correct (per every fix earlier in this brief) but typographically flat —
the unit node's English subtitle had no visual distinction from a plain
smaller copy of the name, and the person node's photo path had literally
never been previewed in this whole session (every fixture used the
initials fallback), so "the official person node" had only ever been
shown half-built.

- Unit node: primary name 13px/600 → 14px/700; English/secondary line
  became a tracked small-caps caption (9.5px, uppercase, 0.07em
  tracking) — the printed-register convention for a transliteration line,
  reasoned from the fact that a plain smaller grey copy under a bold
  Khmer title is a generic "subtitle" pattern, not a considered one for a
  government register. Verified against the realistic long-name case
  (ROOT's "General Department of Taxation") specifically because
  uppercase+tracked text on a *long* string was the real risk — it reads
  as a letterhead caption, not as overwhelming, and wraps cleanly. Band
  padding widened for breathing room (5px 10px → 7px 12px); band label
  got the same uppercase+tracking treatment as the subtitle for
  consistency. All of this is a no-op on Khmer script (no case), so it
  only sharpens Latin text and never touches the Khmer-first content this
  app actually runs on day to day.
- Person node: title line (`.person-node__position`) got a small
  letter-spacing refinement only. Its brand-green colour was deliberately
  *not* revisited — a considered existing choice (title is the one thing
  that should pop when scanning a dense chart for role), not something
  reported as broken, so left alone rather than relitigated unasked.
- Added a self-contained SVG data-URI photo (neutral silhouette, no
  external network dependency, not a real person) to the `person-resized`
  fixture in `ChartEditorTestPage.jsx` specifically so the real
  `data.photoUrl` avatar path — a shipped capability per PRODUCT.md — got
  reviewed at all, not just its initials fallback.

No colour tokens changed, so none of the already-verified contrast ratios
needed re-checking — every change here is size/weight/transform/
letter-spacing on already-passing text colours.

## Fixed after the fifth user review (`/test-chart-editor` functional parity)

User's report: Add Node did nothing on the test route, there was no
right-click menu at all, and nothing could be deleted — "most function on
live one is missing." Explicit instruction: keep this round's visual
redesign, bring the *functional* parity in behind it.

`ChartEditorTestPage.jsx` had grown as a visual fixture harness — static
`initialNodes`/`initialEdges`, a fabricated hierarchy context, a Save
button that only ever set a badge pill. It never wired the interaction
layer `FlowApp.jsx` (the real, Supabase-backed editor) already has as
reusable hooks. Fix was wiring, not reimplementation — every interaction
now calls the same hook the production editor calls:

- `useNodeOperations` for add child/root, connect, reconnect, delete,
  duplicate, collapse/expand, and property updates.
- `useChartHistory` for undo/redo (`nodesRef`/`edgesRef` snapshots).
- `useChartShortcuts` for Ctrl+Z/Y/S/F/D/C/V, `?`, Escape, Delete —
  `active` hardcoded `true` since this route has no tab concept to gate on.
- `useChartBackupOps` for backup download/restore (`chartId` below).
- `computeChartHierarchy` for real `childCounts`/`teamSizes`/collapse-aware
  visible nodes and edges, replacing the hardcoded fixture context values.
- `ContextMenu`, `PropertiesPanel`, `SearchBar`, `ShortcutsModal`,
  `ConfirmModal` mounted the same way `FlowApp.jsx` mounts them — same
  props, same gating (e.g. `ContextMenu` gets no `onViewDetails`/
  `profileRestricted`, which cleanly omits "View Details" exactly like the
  real editor does when it has nothing to view).
- Copy/paste ported inline from `FlowApp.jsx` (clipboard state,
  `withoutRelationalIds`, +40/+40 paste offset, `Date.now()`-based new IDs)
  since it wasn't behind a shared hook to begin with.

Deliberately still not wired, because each needs a real backend record
this route has no way to supply: Share (`isOwner={false}` hides it
outright), Preview mode (`onPreviewMode` no-op), staff-profile viewing
(`onViewStaffProfile` no-op, and `ContextMenu` never offers it — see
above), chart-linking (`charts={[]}`). Save is still simulated
(`onSave` sets the badge pill only) — there is no chart row to persist to.

Verified live via Playwright against the dev server, one feature at a
time: add node, right-click menu (Edit/Add Child/Duplicate/Collapse/
Delete), Properties Panel open→edit→Save Changes committing to the node,
delete via context menu with the real confirmation modal, undo/redo,
copy/paste, search, backup download producing a real file.

Two real bugs surfaced only by actually driving this route in a
browser — neither visible from reading the code in isolation:

1. **Duplicate colour-preset key.** `NodePropertiesPanel.jsx`'s
   `COLOR_PRESETS` (Background Color swatches) had "Teal" and "Green"
   both set to `#136232` — byte-identical. Silent in production because
   `ColorPresetPicker` keys its buttons `key={preset.value}`; the
   duplicate-key warning had simply never printed to a console before,
   since this panel had never been rendered in a browser prior to this
   route existing. Functionally, "Teal" was a second, disguised "Green"
   swatch that did nothing distinct. Fixed: Teal → `#0d9488`. The
   separate 8-entry Badge Color preset array was checked for the same
   mistake and is clean. This bug pre-dates this round's work and would
   reproduce identically on the real `/chart/:id` route, since
   `NodePropertiesPanel.jsx` is shared, unmodified-until-now code — this
   route is just the first place it was ever clicked in a browser.
2. **Backup download silently failed.** `createChartBackup` validates
   `chartId` against `ChartSnapshotSchema` (Zod), which requires an actual
   UUID. This route's placeholder chart id was the readable slug
   `'test-chart-editor'` — nowhere near the UUID regex, so every download
   attempt threw a `ZodError` that never reached the UI. Fixed by using
   the nil UUID `00000000-0000-0000-0000-000000000000`, which the schema
   explicitly whitelists for exactly this kind of fixture placeholder
   (confirmed by reading the regex in the thrown error, not guessed).
   `TEST_CHART_ID` in `ChartEditorTestPage.jsx` now carries a comment
   explaining why it must stay a UUID shape. This one was self-introduced
   while building this route's fixture data, not a pre-existing bug — the
   real route was never at risk, since Supabase always supplies a genuine
   UUID there.

## New: `/test-chart-editor` (isolated preview route)

`src/pages/ChartEditorTestPage.jsx`, added to `App.jsx` as a public route.
No Supabase, no auth — mounts real `OrgNode`/`CustomEdge`/`EditorHeader`
with fixture nodes (including two pre-resized larger than default) inside
the app's real `ThemeProvider`, so the header's light/dark toggle works
normally. Its "Auto Layout" button calls the real `getLayoutedElements`,
and dragging any node exercises the real alignment-guide code path — not
stand-ins. As of the fifth review it's a fully-functional local editor,
not just a fixture display: add/edit/delete/duplicate/collapse, undo/redo,
copy/paste, search, and backup download/restore all run through the same
hooks `FlowApp.jsx` uses (see "Fixed after the fifth user review" above).
Exists because the real `/chart/:id` route needs a signed-in session and a
live chart to reach at all (`EditorShell` → `FlowApp`), which is exactly
why the resize/connector bug went unexercised in a browser through a full
prior review cycle. Not linked from any nav.

## Open

- The `/test-chart-editor` fixtures cover unit nodes (default, resized
  wide, resized tall, coloured, simple/no-badge) and person nodes (head,
  resized, vacant officer leaf) with dynamic (floating) edges only — no
  fixture yet for a manually-dragged waypoint edge (`data.points`) surviving
  a node resize, which exercises `withAnchorElbows`'/`snapPtsToAxes` healing
  in CustomEdge.jsx rather than `floatingEdge.js` directly.
- Properties panel, context menu, modals and preview mode still carry the
  older frosted-glass styling; they read as a different world up close —
  and now also lag the freshly-bumped `--nx-radius`/`--nx-shadow` chrome.
- The real, Supabase-backed `/chart/:id` route (auth, autosave, share,
  backup/restore) is still unexercised in a browser — only the fixture
  route has been. The fix, restyle, and alignment guides all apply to
  shared CSS/components (`OrgNode.jsx`, `chart-editor.css`), so there's no
  reason to expect divergence, but it hasn't been *seen* there.
- Alignment guides currently compare edge/centre lines only (left, centreX,
  right / top, centreY, bottom) — no equal-spacing ("three objects evenly
  spaced") detection, which Figma has and Visio's own reference screenshot
  didn't show either. Not built because it wasn't asked for; a reasonable
  next step if the user wants it.
- ~~Auto-layout can still leave a parent and a single child a few px out of
  alignment~~ — looked at: `getLayoutedElements` centres correctly from
  real measured width; a prior apparent misalignment was fixture positions
  never having been run through it (see "Fixed after the third user
  review"). If this recurs with Auto Layout actually invoked, it's a new
  bug, not this one re-opened.
- `/test-chart-editor` deliberately still can't exercise Share, Preview
  mode, staff-profile viewing (right-click → View Details), or
  chart-to-chart linking — each needs a real backend chart/session record
  this route has no way to fabricate safely. If any of these need review,
  exercise them on the real `/chart/:id` route rather than extending this
  fixture harness to fake a backend.
