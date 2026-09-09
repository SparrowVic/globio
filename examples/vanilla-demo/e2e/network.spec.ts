import { test, expect } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expectHeroReady } from './observability';

test('a failed engine download offers a full-page reload that really recovers', async ({ page }) => {
  // Locate the emitted engine by its public export rather than a hashed filename.
  const folder = resolve('dist/assets');
  const assets = await readdir(folder);
  const modules = await Promise.all(assets.filter((file) => file.endsWith('.js')).map(async (file) => ({
    file, source: await readFile(resolve(folder, file), 'utf8'),
  })));
  const engine = modules.find(({ source }) => /export\s*\{[^}]*\bcreateGlobe\s*[,}]/.test(source.slice(-5_000)));
  expect(engine, 'The production engine chunk should export createGlobe').toBeDefined();
  let attempts = 0;
  await page.route(`**/assets/${engine!.file}`, async (route) => {
    attempts++;
    if (attempts === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.home-globe-poster')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save PNG', exact: true })).toBeDisabled();
  const reload = page.getByRole('button', { name: 'Reload page', exact: true });
  await expect(reload).toBeVisible();
  await Promise.all([
    page.waitForEvent('domcontentloaded'),
    reload.click(),
  ]);
  await expectHeroReady(page);
  expect(attempts).toBe(2);
  await expect(reload).toHaveCount(0);
});
