import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Regression guard for the connector-stacking bug.
//
// Connectors used to be painted with `rgba(19, 98, 50, 0.55)`. A translucent
// stroke composites with every stroke beneath it, so two edges routed along the
// same trunk painted that shared run twice (1 - 0.45^2 = 80% ink instead of
// 55%), three painted it three times, and so on. The shared segment came out
// visibly darker than the rest of the line, and got darker with every edge
// added. Opaque ink over opaque ink is still just ink.
//
// These tests fail if any alpha creeps back into the connector paint path.

const readEditorCss = () =>
  readFile(new URL('../src/styles/chart-editor.css', import.meta.url), 'utf8');

/** Colours that carry an alpha channel and therefore accumulate when stacked. */
const TRANSLUCENT = /\b(?:rgba|hsla)\s*\(|\/\s*0?\.\d+\s*\)|#[0-9a-f]{4}(?![0-9a-f])|#[0-9a-f]{8}\b/i;

test('the connector ink token is opaque in every theme', async () => {
  const css = await readEditorCss();

  const declarations = [...css.matchAll(/--nx-edge:\s*([^;]+);/g)].map((m) =>
    m[1].trim(),
  );

  assert.ok(
    declarations.length >= 2,
    'expected --nx-edge to be defined for both the light and dark themes',
  );

  for (const value of declarations) {
    assert.doesNotMatch(
      value,
      TRANSLUCENT,
      `--nx-edge must be fully opaque or stacked connectors accumulate; got "${value}"`,
    );
  }
});

test('the edge path paints with the opaque connector token', async () => {
  const css = await readEditorCss();

  const rule = css.match(/\.react-flow__edge-path\s*\{([^}]*)\}/);
  assert.ok(rule, 'expected a .react-flow__edge-path rule');

  const stroke = rule[1].match(/(?:^|[;\s])stroke:\s*([^;]+);/);
  assert.ok(stroke, 'expected .react-flow__edge-path to set a stroke');
  assert.equal(stroke[1].trim(), 'var(--nx-edge)');
});

test('no stroke in the editor stylesheet carries an alpha channel', async () => {
  const css = await readEditorCss();

  const strokes = [...css.matchAll(/(?:^|[;{\s])stroke:\s*([^;}]+)[;}]/g)].map(
    (m) => m[1].trim(),
  );

  for (const value of strokes) {
    assert.doesNotMatch(
      value,
      TRANSLUCENT,
      `stroke "${value}" is translucent and will darken where connectors overlap`,
    );
  }
});

test('the active-state casing is opaque paper, not a translucent halo', async () => {
  const edge = await readFile(
    new URL('../src/components/CustomEdge.jsx', import.meta.url),
    'utf8',
  );

  // The old selection/hover treatment layered a wide `strokeOpacity` pass over
  // the line. Two selected edges sharing a trunk doubled it.
  assert.doesNotMatch(
    edge,
    /strokeOpacity/,
    'CustomEdge must not use strokeOpacity — it accumulates on shared paths',
  );
  assert.match(
    edge,
    /stroke:\s*"var\(--nx-paper\)"/,
    'the active casing should be opaque paper',
  );
});

test('per-edge colour and width are set inline so a stylesheet cannot override them', async () => {
  const edge = await readFile(
    new URL('../src/components/CustomEdge.jsx', import.meta.url),
    'utf8',
  );

  // A CSS rule outranks an SVG presentation attribute, so painting the main
  // stroke via `stroke={...}` let index.css silently discard whatever colour
  // and width the properties panel had set on the edge.
  const mainPath = edge.match(
    /<path\s+id=\{id\}[\s\S]*?\/>/,
  );
  assert.ok(mainPath, 'expected the main edge path to be rendered with id={id}');

  assert.doesNotMatch(
    mainPath[0],
    /\n\s*stroke=\{/,
    'the main stroke must not use a presentation attribute; a stylesheet beats it',
  );
  assert.match(mainPath[0], /stroke:\s*strokeColor/);
  assert.match(mainPath[0], /strokeWidth,/);
});

test('selection is drawn around the line, never over its colour', async () => {
  const edge = await readFile(
    new URL('../src/components/CustomEdge.jsx', import.meta.url),
    'utf8',
  );

  // Selecting an edge used to repaint its stroke, which hid the very property
  // you select an edge in order to change. The main path must keep painting the
  // author's colour in every state; the ring is a separate, wider pass beneath.
  assert.doesNotMatch(
    edge,
    /paintedStroke/,
    'the main stroke must not be swapped for a state colour',
  );
  assert.match(
    edge,
    /stroke:\s*"var\(--nx-select\)"/,
    'the selection ring should paint in the selection token',
  );
});

test('every editor token CustomEdge references is actually defined', async () => {
  const [edge, css] = await Promise.all([
    readFile(new URL('../src/components/CustomEdge.jsx', import.meta.url), 'utf8'),
    readEditorCss(),
  ]);

  // `var(--nx-emerald)` was referenced here and defined nowhere. An unresolved
  // var() does not fall back — it drops the property to its initial value, and
  // `stroke`'s initial is `none`, so a selected edge rendered invisible. Cheap
  // to catch by reading the stylesheet; invisible until someone clicks a line.
  const defined = new Set(
    [...css.matchAll(/(--nx-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
  );
  const referenced = new Set(
    [...edge.matchAll(/var\(\s*(--nx-[a-z0-9-]+)/g)].map((m) => m[1]),
  );

  assert.ok(referenced.size > 0, 'expected CustomEdge to reference editor tokens');

  const missing = [...referenced].filter((name) => !defined.has(name));
  assert.deepEqual(
    missing,
    [],
    `CustomEdge references token(s) chart-editor.css never defines: ${missing.join(', ')}`,
  );
});

test('no hex-alpha is concatenated onto a token reference', async () => {
  const edge = await readFile(
    new URL('../src/components/CustomEdge.jsx', import.meta.url),
    'utf8',
  );

  // `${strokeColor}40` produced a usable colour only while strokeColor was a
  // literal hex. It defaults to `var(--nx-edge)`, and "var(--nx-edge)40" is
  // simply invalid, so the waypoint dots and edge label lost their fill,
  // border and shadow without any error anywhere.
  assert.doesNotMatch(
    edge,
    /\$\{strokeColor\}[0-9a-f]{2}/i,
    'append alpha to a resolved colour, never to a var() reference',
  );
});
