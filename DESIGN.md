# Design

<!-- impeccable:design-doc 1 -->

Recorded from the built Chart Editor surface (`/chart/:id`). Other surfaces
(landing, dashboard, auth) still run the older system and are untouched.

## Palette — green and white

GDT's colours, per PRODUCT.md's brand commitment: **Emerald `#136232`** and
**white**. Green carries identity, the title band, and the primary action.
White is the working surface. Text is a near-black with a green cast so it
belongs to the same family.

Gold appears only on the seal and the search-hit ring. Red appears only on a
genuinely destructive action. Neither is a theme colour.

Tokens are `--nx-*` in `src/styles/chart-editor.css`; light lives on
`:root[data-theme="light"]`, dark on `:root` (the app's existing convention).

| Token | Light | Dark | Role |
|---|---|---|---|
| `--nx-ground` | `#eef1ee` | `#0d1512` | canvas |
| `--nx-paper` | `#ffffff` | `#16201b` | node and chrome surface |
| `--nx-ink` | `#16211b` | `#eef2ef` | primary text |
| `--nx-ink-2` | `#44514a` | `#b6c2ba` | secondary text |
| `--nx-ink-3` | `#5d6b63` | `#93a199` | labels (4.9:1 on ground) |
| `--nx-rule` | `#788c7e` | `#556d5f` | card border (3.2:1 on ground) |
| `--nx-green` | `#136232` | `#34a866` | accent, buttons, borders, links |
| `--nx-band-default` | `#136232` | `#136232` | node title band, both themes |
| `--nx-edge` | `#6b7a71` | `#7e8f85` | connector ink — **must stay opaque** |
| `--nx-gold` | `#8a6f1a` | `#d4af37` | seal, search hit |
| `--nx-gold-tint` | `#fefaf0` | `#2e2712` | "Saving" pill background |
| `--nx-gold-border` | `#a8873f` | `#8a6f2c` | "Saving" pill border |
| `--nx-guide` | `#c81f8f` | `#ff5fc4` | drag-time alignment guide, nothing else |

`--nx-green` brightens in dark so it stays legible as text and borders on a
dark ground. `--nx-band-default` deliberately does **not** — white label text on
the brightened green only reaches 3.0:1, under the 4.5:1 floor, so the band
stays brand emerald in both themes where white clears 7.4:1.

The gold tint/border pair took two tries. The obvious pale tint
(`#faf3df` light / border `#e4d29c`) put `--nx-gold` text at 4.34:1 (under
4.5) and the border at 1.35:1 (under 3) — a soft-state pair copied from a
mood rather than measured. Both channels needed pushing further apart than
looked necessary by eye; verify with `check-contrast.mjs`, not the color
picker.

## Nodes

One card for every unit. There is deliberately **no tier, rank, or level
system**:

- Nothing infers a hierarchy the author did not declare.
- Nothing sets a node's size from its name or its position in the chart.
- The band colour comes from `data.color`, the label from `data.badgeText`, and
  the size from wherever the author dragged the resize handle.

An earlier build derived a tier from the unit's name and its graph depth, then
drew each tier at a fixed width. It guessed wrong, and the per-tier `min-width`
made nodes un-resizable. Both are gone; do not reintroduce them.

Label ink on an authored band colour is chosen by luminance (`readableInk` in
`OrgNode.jsx`) so a pale custom colour never leaves white text unreadable.

**The two official node templates read as different kinds of object on
purpose.** A unit node is a label the author fully owns (any band colour,
any size, freeform text); a person node is a fixed-format profile card
(photo, name, title) — the typography treatment now makes that difference
legible at a glance instead of both just being "a box with two lines of
text":

- Unit node: primary name bumped to 14px/700 (from 13px/600) for clearer
  weight against its own subtitle. The English/secondary line
  (`.org-node__name-en`) is now a small tracked caption — 9.5px,
  uppercase, `letter-spacing: 0.07em` — the printed-register convention
  for a transliteration line under a native-script title, not just a
  smaller copy of the name. Verified against the realistic long case
  (`ROOT`'s "General Department of Taxation") before committing to it:
  uppercase+tracking reads as a letterhead caption rather than
  overwhelming the card, and wraps cleanly where it must. `.org-node__label`
  (the band chip) got the same uppercase+tracking treatment — both are
  no-ops on Khmer script (no case), so this only sharpens Latin text,
  never affects the Khmer-first content the badge/name fields actually
  carry day to day. Band padding widened (5px 10px → 7px 12px) for
  breathing room the tighter original read as cramped.
- Person node: `.person-node__position` (the title/role line) gained
  `letter-spacing: 0.01em` for the same small-refinement reasoning, kept
  otherwise unchanged — its brand-green colour is a considered existing
  choice (role should be the one thing that pops when scanning a dense
  chart for "who holds what"), not revisited here since nothing about it
  was reported as broken.
- The photo treatment (`data.photoUrl`, a real shipped capability per
  PRODUCT.md) had never actually been previewed anywhere in this session
  before this pass — every fixture person node used the initials
  fallback. Added a self-contained SVG data-URI silhouette to
  `person-resized` in `ChartEditorTestPage.jsx` specifically so the real
  avatar-photo path (not just its fallback) gets reviewed. No external
  network dependency, and it doesn't depict a real person.

Person nodes keep their avatar geometry (84px at `-42px`, team pill at `-13px`)
because `floatingEdge.js` aims connector endpoints at exactly those points. The
avatar placeholder is GDT green; an empty seat reads as a quiet neutral outline,
not a red alert — a vacancy is a normal state.

**The card must fill its own resizable box.** `.org-node` and
`.org-node--person` render *inside* the `.react-flow__node` wrapper that
`NodeResizer` actually resizes and that `floatingEdge.js` measures
(`node.measured.width/height`). Without `position: relative; width: 100%;
height: 100%;` on the card itself, dragging a handle grew the invisible
wrapper while the visible card stayed at its min-content size — the resize
handles visibly detached from the shape, and a connector aimed at the
wrapper's new edge landed off in empty space next to the actual (unchanged)
card. This was never caught in a browser (see the surface brief's prior
"Open" item); both symptoms disappeared once the card was made to fill the
box React Flow is already sizing for it. `.org-node--person` needs the same
fix for a second reason: its avatar/pill/badges are `position: absolute`
with no positioned ancestor otherwise, so without this they anchor to the
wrapper too and drift on resize.

Both cards also lift 1px with a stronger shadow on hover (`--nx-shadow` →
`--nx-shadow-lift`), reinforcing that they're resizable/draggable objects
sitting on the canvas, not flat ground.

**The resize grip sits centred exactly on the border; the connect-handle
anchor sits further out, past it, with its own visible gap.** Both used to
be centred on the same point (React Flow's own default
`.react-flow__handle-*` positioning for the anchor; the grip's decorative
pill matching it) — so selecting a node drew two similar white/green shapes
on top of each other as one illegible blob, and the grip specifically was
hard to find or grab on its own. Two intermediate fixes were tried and
superseded: pushing the grip 9px *outside* stopped the overlap but put both
controls on the same side of the border; pulling it 4px *inside* instead
read as "part of the shape" but stopped matching the reference composition
the user was building toward (corner dots and edge pills both sitting
directly on a Figma-style selection outline). The grip is now back on the
border exactly (`.react-flow__resize-control.line::after`, no offset); the
anchor dot (`.flow-handle`, via `.react-flow__handle-{top,bottom,left,
right}.flow-handle` rules overriding React Flow's own on-the-border
default) still sits 7px further out. The two land at different points
either way — the fix for the original overlap was always the anchor moving
out, not the grip moving in, and moving the grip back to the line doesn't
reopen the collision. Confirmed by measuring rendered positions directly,
not by eye — at this scale a few pixels are easy to misjudge from a
screenshot. Person cards' avatar-offset top/bottom (`-42px`/`-13px`) are
untouched — that override is more specific and still wins — so the anchor
change reaches unit nodes' four sides and a person card's left/right.

**Quick-add arrow buttons were built, tried, and fully removed.** Four
Miro/Whimsical/Lucidchart-style buttons (click one to create a new,
already-connected node in that direction) shipped around a reference image
that also showed plain corner/edge resize handles with no such buttons.
Bottom came out first ("remove this arrow" against a screenshot of it);
the next review removed the rest outright ("remove it completely") with
the reasoning that manual drag-from-the-anchor to an existing node is the
preferred way to connect nodes — which is exactly what the anchor dot
above exists for. `addDirectionalNode` is gone from `useNodeOperations.js`,
`FlowApp.jsx`, and `ChartEditorTestPage.jsx`; `DirectionalAddButtons` and
its icons are gone from `OrgNode.jsx`; `.org-node__add-btn*` is gone from
this file. `.org-node`'s `overflow: hidden` → `visible` (needed while the
buttons rendered outside the card) and `.org-node__band`'s own top-corner
radius (needed so nothing depended on that overflow clipping it) were
*not* reverted — both are harmless with the buttons gone, and reverting
overflow risked reopening whatever, if anything, the anchor dot's own
7px-outside position was relying on it for. Left as informed inaction, not
an oversight.

## Connectors

**Strokes must be fully opaque.** A translucent stroke composites with every
stroke beneath it, so edges sharing a trunk paint that run repeatedly and it
grows darker with each one. This was a real shipped bug
(`rgba(19,98,50,0.55)`); `test/connectorInk.test.js` guards its return.

- State is carried by *swapping* the stroke colour, never by layering a second
  translucent pass over it.
- The selected/hover casing is opaque `--nx-paper` beneath the line, not a glow.
- Stroke and width are set through inline `style`, not SVG presentation
  attributes — a stylesheet rule outranks an attribute, which is how per-edge
  colour and width from the properties panel used to be silently discarded.
- Corner radius defaults to **2px**. At the old default of 10, a short crossbar
  (the ~30px offset between a parent and a not-quite-aligned child) had 10px
  rounded off each end, and the connector read as a wandering S instead of a
  right angle.

**A crooked parent→child line is a positioning problem, not a connector
bug.** `getFloatingEdgeParams` connects side-centres, so a straight run
needs both nodes' centres to actually line up — and centring is `layoutUtils.js`'s
job (Dagre, keyed off each node's real `node.measured.width/height`), not
the connector's. Confirmed directly: nodes hand-placed without running
Auto Layout can look off-centre and force a visible jog even though nothing
is wrong with either node's size or the edge math; running the real Auto
Layout (`getLayoutedElements`, the same function `FlowApp.jsx` calls, now
also wired into `/test-chart-editor` instead of stubbed) straightens them
immediately because it centres every node from its actual measured width.

## Canvas

A single faint dot on the 20px grid — enough to show scale, nothing more. A
ruled or high-contrast grid turns a government register into wallpaper.

**Movement is free; the grid and sibling alignment are both contextual
magnets, not a rounding rule.** React Flow's own `snapToGrid`/`snapGrid` are
deliberately not set — that unconditionally rounds *every* position to the
nearest 20px multiple regardless of where the pointer actually is, which
read as the canvas "always defining a place" for a shape instead of
following the drag, and had a sharper problem: a sibling whose centre
doesn't itself land on a grid multiple was structurally unreachable by
dragging, since the best the grid-rounded position could do is half a cell
away — easily more than the alignment tolerance, so the guide it should
have deferred to could never fire.

`onNodeDrag`/`onNodeDragStop` in FlowApp.jsx (`nodeAlignment.js` for the
math, `AlignmentGuides.jsx` for the render) replace both with one system,
Figma/Visio-style: while dragging, the node's own left/centre/right and
top/centre/bottom lines are compared against every visible sibling's same
lines *and* the nearest grid line, all as one pool of candidates within a
6-screen-px tolerance (constant feel at any zoom — divided by `getZoom()`).
Whichever candidate is closest wins and the node snaps onto it exactly; a
dashed guide (`--nx-guide`, a magenta not used anywhere else in the
palette, so it never reads as chrome) is rendered the full span of the
canvas via `ViewportPortal` for as long as that match holds, and clears on
drop. The snap is applied in `onNodeDragStop` as well as `onNodeDrag` — the
drag-end pointer-up doesn't fire another `onNodeDrag` first, so a version
that only handled the live-drag case snapped every guide correctly but let
the position the user actually ends up looking at land whichever
unsnapped/grid-rounded spot the pointer released on.

## Chrome

White command bar with a 1px green underline, **8px radii** (`--nx-radius`,
raised from 4px — one rounding language now shared by chrome, controls, and
nodes, matching the admin dashboard's `rounded-lg`/`rounded-[14px]` card
family), 12px labels. Primary actions are solid green with white text;
secondary are white with a green hover. The header itself carries a subtle
`--nx-header-shadow` beneath its green underline for separation from the
canvas — the same soft, wide-blur formula (`--nx-shadow`/`--nx-shadow-lift`)
now used everywhere else, adapted from the admin dashboard's `--pa-shadow`
(`0 1px 2px / 0 10px 30px`, tinted with the surface's own ink rather than
literal black). The old shadow was a tight, close blur that read as
barely-there on a light node close in lightness to its canvas; the wider
ambient layer is what actually fixed the "nodes are barely visible on light
theme" complaint — not a border or colour change, which would have disturbed
already-verified text-contrast ratios.

The seal ships at `public/gdt-seal-mark{,@2x,@3x}.png`, cropped square from the
master lockup and rendered at display size (32px, up from 30px to match the
56px header) — **do not** scale the full 2609×546 lockup down to header
height, which rasterises soft and is what made the old logo appear to
sharpen on hover. Wordmarks are live text.

The save-status indicator (`.save-badge`) is a soft-tinted pill — tint
background, matching soft border, saturated text — the same construction as
the admin dashboard's "Saving…" indicator, not a bare colour change on
transparent text like the earlier version.

Focus rings across the toolbar use a soft translucent ring
(`3px solid rgba(19,98,50,.28)`) instead of a solid 2px green outline —
quieter, same as the admin dashboard's `pa-focus-ring`.

## Type

Manrope for Latin, Kantumruy Pro for Khmer, both already loaded app-wide and
claimed explicitly by the editor (the app `<body>` still sets Inter for the
surfaces that have not been redesigned). Khmer is set 1–2px larger than Latin at
the same rank; its stacked subscripts collapse first. Counts and zoom use
tabular figures so they do not reflow.

## Motion

150ms, `cubic-bezier(0.2, 0, 0, 1)`. Motion clarifies state change and nothing
else. Everything collapses to ~1ms under `prefers-reduced-motion`.

## Accessibility floor

Verified with `.agents/skills/frontend-ui-engineering/scripts/check-contrast.mjs`
in both themes: text ≥4.5:1, UI strokes and card borders ≥3:1. Icon-only
controls carry `aria-label`; decorative icons are `aria-hidden`.

## Verifying this surface in a browser

The real editor sits behind Supabase auth and a live chart (`EditorShell` →
`FlowApp`), which is why the resizer/connector fix above went unexercised in
a browser for a full review cycle. `/test-chart-editor`
(`src/pages/ChartEditorTestPage.jsx`) is a standalone, unauthenticated route
mounting the same `OrgNode`/`CustomEdge`/`EditorHeader` with fixture data —
including two nodes pre-resized larger than default specifically to catch
the wrapper-vs-card class of bug. Its "Auto Layout" button calls the real
`getLayoutedElements` (not a stub), so parent/child centring can be checked
against production logic, not just eyeballed fixture coordinates. It
renders inside the app's real `ThemeProvider`, so the header's own
light/dark toggle works normally. Not linked from any nav; reach it
directly at `/test-chart-editor` in dev.

It is now a fully-functional local editor, not just a fixture display —
add/edit/delete/duplicate/collapse, undo/redo, copy/paste, search, and
backup download/restore all run through the same hooks `FlowApp.jsx` uses
in production, not reimplementations. Driving those interactions live
(rather than reading the wiring) surfaced two real bugs no prior review
had caught: a duplicate colour value in `NodePropertiesPanel.jsx`'s
background-colour presets (Teal and Green both `#136232`, byte-identical,
so React logged a duplicate-key warning and the Teal swatch silently did
nothing distinct from Green), and a backup-download failure specific to
this route's own placeholder chart id (a readable slug isn't a UUID, and
the backup schema requires one — fixed by using the nil UUID
`00000000-0000-0000-0000-000000000000`, which that schema explicitly
whitelists for fixture use). Full detail in the surface brief's
"Fixed after the fifth user review" section.

**Automating a drag against this canvas: send a throwaway move before the
real one.** A Playwright `mouse.move → mouse.down → mouse.move(target)`
sequence reliably drops the node ~10–15px short of an exact target — not
noise, a fixed shortfall confirmed by reading `node.position` directly
(bypass `boundingBox()`'s screen-px/zoom conversion entirely for this kind
of check). React Flow's drag doesn't track movement until an initial
mousemove after mousedown "arms" it; that first event doesn't itself count
as movement. Inserting a tiny (~5px) warm-up move, a short pause, then the
real move brought tracking to within ~1% of the intended flow-space delta.
This is a synthetic-input artifact, not a product bug — a real mouse
generates a dense, continuous event stream that never isolates a single
"first" event the way one deliberate `mouse.move()` call does.
