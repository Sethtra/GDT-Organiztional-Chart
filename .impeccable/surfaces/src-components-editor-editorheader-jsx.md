---
version: 1
slug: "src-components-editor-editorheader-jsx"
primary_target: "src/components/editor/EditorHeader.jsx"
related_targets: ["src/styles/chart-editor.css","src/components/OrgNode.jsx","src/components/CustomEdge.jsx","src/utils/floatingEdge.js"]
---

# Chart Editor surface brief

- Scope: the Chart Editor surface (`/chart/:id`) — command bar, canvas, unit and
  person nodes, connectors, controls, minimap, status bar, tab bar.
- Visitor mode: **Operate**. Officers and chart owners come to read and change a
  structure. Expression must never obscure the task or a familiar affordance.
- Palette: GDT emerald `#136232` + white, per PRODUCT.md. Gold is the seal and
  the search hit only; red is destructive actions only. See DESIGN.md.
- Canvas: one faint dot grid, nothing else. This is a government register.

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

## Constraints held fixed

- Toolbar stays at the top with its existing action set and order.
- Person-node geometry is load-bearing — the 84px avatar at `-42px` and the team
  pill at `-13px` are where `floatingEdge.js` aims connector endpoints.
- Profile data still opens only via right-click → View Details.
- No chart-JSON schema change and no migration.

## Fixed after the first user review

- **Connectors landed off-centre.** `getNodeRect` clamped a measured width up to
  an assumed CSS minimum (160 / 220), moving the computed side-centre half the
  difference off the visible handle — and the error changed size whenever the
  CSS min-width was edited. Measurements are now used verbatim. Guarded by
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

## Verified

Contrast in both themes (text ≥4.5:1, borders and strokes ≥3:1),
stacked-connector equality by pixel sample, 47 node tests, 19 vitest tests,
typecheck, production build, design detector clean.

## Open

- Properties panel, context menu, modals and preview mode still carry the older
  frosted-glass styling; they read as a different world up close.
- The live React Flow canvas (drag-to-connect, routing, the resizer) has not
  been exercised in a browser — the editor needs Supabase auth to reach, so
  every canvas fix here is verified by unit test and static render, not by use.
- Auto-layout can still leave a parent and a single child a few px out of
  alignment; the 2px corner radius keeps that reading as a right angle rather
  than an S, but the underlying centring is worth a look.
