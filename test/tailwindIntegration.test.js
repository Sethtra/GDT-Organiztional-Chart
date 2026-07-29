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

test('staff form native selects inherit the active light or dark theme', async () => {
  const css = await readFile(
    new URL('../src/index.css', import.meta.url),
    'utf8',
  );

  assert.match(
    css,
    /select\.theme-field\s*\{[\s\S]*color:\s*var\(--text-primary\);[\s\S]*color-scheme:\s*dark;/,
  );
  assert.match(
    css,
    /select\.theme-field option,[\s\S]*background-color:\s*var\(--bg-elevated\);[\s\S]*color:\s*var\(--text-primary\);/,
  );
  assert.match(
    css,
    /:root\[data-theme="light"\] select\.theme-field\s*\{[\s\S]*color-scheme:\s*light;/,
  );
});
