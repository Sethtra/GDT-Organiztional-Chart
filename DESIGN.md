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

`--nx-green` brightens in dark so it stays legible as text and borders on a
dark ground. `--nx-band-default` deliberately does **not** — white label text on
the brightened green only reaches 3.0:1, under the 4.5:1 floor, so the band
stays brand emerald in both themes where white clears 7.4:1.

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

Person nodes keep their avatar geometry (84px at `-42px`, team pill at `-13px`)
because `floatingEdge.js` aims connector endpoints at exactly those points. The
avatar placeholder is GDT green; an empty seat reads as a quiet neutral outline,
not a red alert — a vacancy is a normal state.

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

## Canvas

A single faint dot on the 20px snap grid — enough to show a drag landing on the
grid, nothing more. A ruled or high-contrast grid turns a government register
into wallpaper.

## Chrome

White command bar with a 1px green underline, 4px radii, 12px labels. Primary
actions are solid green with white text; secondary are white with a green hover.
The seal ships at `public/gdt-seal-mark{,@2x,@3x}.png`, cropped square from the
master lockup and rendered at display size — **do not** scale the full 2609×546
lockup down to header height, which rasterises soft and is what made the old
logo appear to sharpen on hover. Wordmarks are live text.

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
