import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// OrgNodePro is a design experiment mounted only by /test-chart-editor. The
// production editor must keep using OrgNode until the revision is deliberately
// promoted after review.
//
// The stylesheet checks stay as they were. CSS has no module scope, so
// org-node-pro.css still shares a bundle with everything else, and it still
// must not reach past its own namespace or redefine a shared token.

const read = (p) => readFile(new URL(`../${p}`, import.meta.url), 'utf8');
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

test('the premium node stays isolated to the test editor route', async () => {
  const [flowApp, testPage] = await Promise.all([
    read('src/components/editor/FlowApp.jsx'),
    read('src/pages/ChartEditorTestPage.jsx'),
  ]);

  const mounted = /const nodeTypes = \{\s*orgNode:\s*(\w+)\s*\}/;
  const live = flowApp.match(mounted);
  const test_ = testPage.match(mounted);

  assert.ok(live, 'expected FlowApp to declare a nodeTypes map');
  assert.ok(test_, 'expected ChartEditorTestPage to declare a nodeTypes map');
  assert.equal(live[1], 'OrgNode', 'production must keep the shipped OrgNode');
  assert.equal(test_[1], 'OrgNodePro', 'the test route must mount OrgNodePro');
  assert.notEqual(live[1], test_[1], 'the experiment must not leak into production');
});

test('person and geometric cards still route through OrgNode', async () => {
  const pro = await read('src/components/OrgNodePro.jsx');

  // The unit card was redesigned; person and geometric templates deliberately
  // stay on production OrgNode so their geometry is reviewed in this route.
  assert.match(pro, /meta\.isPerson/);
  assert.match(pro, /meta\.template === 'shape'/);
  assert.match(pro, /<OrgNode\b/);
});

test('new geometric shapes start as empty transparent outlines', async () => {
  const [node, operations, panel, panelStyles] = await Promise.all([
    read('src/components/OrgNode.jsx'),
    read('src/hooks/useNodeOperations.js'),
    read('src/components/properties/NodePropertiesPanel.jsx'),
    read('src/styles/properties-panel.css'),
  ]);

  assert.match(operations, /color: isShape \? 'transparent'/);
  assert.match(operations, /newNode\.data\.name = ''/);
  assert.match(operations, /borderColor: '#475569', borderWidth: 2/);
  assert.doesNotMatch(node, /data\.name \|\| ["']Shape["']/);
  assert.match(panel, /currentMeta\.template !== "shape" && nextMeta\.template === "shape"/);
  assert.match(panel, /setColor\("transparent"\)/);
  assert.match(
    panelStyles,
    /\.pp-node-type-preview--round > span,[\s\S]*?background:\s*transparent/,
  );
});

test('geometric shape shell shares the resizer minimum', async () => {
  const [node, styles] = await Promise.all([
    read('src/components/OrgNode.jsx'),
    read('src/styles/chart-editor.css'),
  ]);

  assert.match(node, /minWidth=\{32\}/);
  assert.match(node, /minHeight=\{32\}/);

  const shapeRule = styles.match(/\.org-node--shape\s*\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(shapeRule, /min-width:\s*32px/);
  assert.match(shapeRule, /min-height:\s*32px/);
  assert.doesNotMatch(shapeRule, /112px/);
});

test('geometric shape border stays behind resize and connection handles', async () => {
  const styles = await read('src/styles/chart-editor.css');
  const resizeRule = styles.match(
    /\.org-node--shape \.react-flow__resize-control\s*\{([\s\S]*?)\}/,
  )?.[1] || '';
  const connectionRule = styles.match(/\.flow-handle\s*\{([\s\S]*?)\}/)?.[1] || '';

  assert.match(resizeRule, /z-index:\s*5/);
  assert.match(connectionRule, /z-index:\s*6\s*!important/);
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
