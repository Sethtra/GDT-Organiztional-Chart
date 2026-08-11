import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('primary app surfaces use the shared header geometry contract', async () => {
  const [landing, dashboard, navbar] = await Promise.all([
    read('src/pages/LandingTestPage.tsx'),
    read('src/pages/DashboardTestPage.jsx'),
    read('src/components/Navbar.jsx'),
  ]);

  for (const source of [landing, dashboard, navbar]) {
    assert.match(source, /gdt-shell-header__inner/);
    assert.match(source, /gdt-shell-header__logo/);
  }
  assert.match(landing, /gdt-shell-header__inner--landing/);
});

test('the shared header contract owns common rhythm with a landing-width variant', async () => {
  const css = await read('src/index.css');

  assert.match(
    css,
    /\.gdt-shell-header__inner\s*\{[^}]*max-width:\s*1400px;[^}]*height:\s*74px;[^}]*padding:\s*0 16px;/s,
  );
  assert.match(css, /@media \(min-width:\s*640px\)[\s\S]*?padding-inline:\s*28px;/);
  assert.match(css, /@media \(min-width:\s*1024px\)[\s\S]*?padding-inline:\s*46px;/);
  assert.match(css, /\.gdt-shell-header__inner--landing\s*\{\s*max-width:\s*1540px;/);
  assert.match(css, /@media \(min-width:\s*1024px\)[\s\S]*?\.gdt-shell-header__inner--landing\s*\{\s*padding-inline:\s*40px;/);
  assert.match(css, /\.gdt-shell-header__logo\s*\{[^}]*height:\s*40px;/s);
  assert.match(css, /@media \(max-width:\s*768px\)[\s\S]*?\.gdt-shell-header__logo\s*\{\s*height:\s*36px;/);
});
