import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Tailwind utilities outrank the preserved legacy reset', async () => {
  const css = await readFile(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  );

  assert.match(css, /@import "tailwindcss\/utilities\.css";/);
  assert.doesNotMatch(
    css,
    /@import "tailwindcss\/utilities\.css" layer\(utilities\);/,
  );
});
