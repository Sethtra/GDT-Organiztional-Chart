import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('autosave never rasterizes the chart canvas', async () => {
  const persistence = await read('src/hooks/useChartPersistence.ts');

  assert.match(
    persistence,
    /let refreshThumbnail = options\.refreshThumbnail === true;[\s\S]*?if \(refreshThumbnail\) \{[\s\S]*?toPng/,
    'thumbnail rasterization must require an explicit save option',
  );
  assert.match(
    persistence,
    /setTimeout\([\s\S]*?performSave\(\{ refreshThumbnail: false \}\)/,
    'debounced autosave must explicitly skip thumbnail generation',
  );
});

test('manual save may refresh the dashboard thumbnail', async () => {
  const flowApp = await read('src/components/editor/FlowApp.jsx');

  assert.match(
    flowApp,
    /onSave=\{\(\) => performSave\(\{ refreshThumbnail: true \}\)\}/,
  );
});
