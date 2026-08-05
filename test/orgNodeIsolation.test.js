import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// OrgNodePro was reviewed on /test-chart-editor and is now the live unit card.
//
// These tests started life enforcing the opposite — that the revision could not
// reach production while it was under review. Now that it has shipped, the
// thing worth guarding is the reverse: that the two routes never drift apart
// again. A test route rendering a different node than production is worse than
// no test route, because every review it produces is about the wrong card.
//
// The stylesheet checks stay as they were. CSS has no module scope, so
// org-node-pro.css still shares a bundle with everything else, and it still
// must not reach past its own namespace or redefine a shared token.

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the live editor and the test route mount the same node component', async () => {
  const [flowApp, testPage] = await Promise.all([
    read('src/components/editor/FlowApp.jsx'),
    read('src/pages/ChartEditorTestPage.jsx'),
  ]);

  const mounted = /const nodeTypes = \{\s*orgNode:\s*(\w+)\s*\}/;
  const live = flowApp.match(mounted);
  const test_ = testPage.match(mounted);

  assert.ok(live, 'expected FlowApp to declare a nodeTypes map');
  assert.ok(test_, 'expected ChartEditorTestPage to declare a nodeTypes map');
  assert.equal(
    live[1],
    test_[1],
    'the test route must render the same node component production does',
  );
});

test('person cards still route through OrgNode', async () => {
  const pro = await read('src/components/OrgNodePro.jsx');

  // The unit card was redesigned; the person card deliberately was not. Its
  // avatar geometry is load-bearing for floatingEdge.js's connector anchors.
  assert.match(pro, /if \(meta\.isPerson\)/);
  assert.match(pro, /<OrgNode\b/);
});

test('the pro stylesheet stays inside its own namespace', async () => {
  const rules = stripComments(await read('src/styles/org-node-pro.css'));

  assert.doesNotMatch(
    rules,
    /\.org-node/,
    'org-node-pro.css must not select .org-node* — that is the person card',
  );
  assert.doesNotMatch(
    rules,
    /\.person-node/,
    'org-node-pro.css must not select .person-node* — person cards are unchanged',
  );
  assert.match(rules, /\.gdt-node\b/);
});

test('the pro stylesheet reads design tokens but never redefines one', async () => {
  const rules = stripComments(await read('src/styles/org-node-pro.css'));

  // Declaring --nx-anything here would leak a new value into every surface
  // that resolves that token, not just the node this file is about.
  const declared = [...rules.matchAll(/(--nx-[a-z0-9-]+)\s*:/g)].map((m) => m[1]);
  assert.deepEqual(
    declared,
    [],
    `org-node-pro.css must not declare --nx-* tokens; found ${declared.join(', ')}`,
  );

  assert.match(rules, /var\(--nx-/, 'expected the pro card to read the shared tokens');
});
