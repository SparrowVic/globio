import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { contextCounts, expectHeroReady, observeBrowser } from './observability';

test('six live styles and themes release old WebGL contexts, and PNG export is valid', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await observeBrowser(page);
  await page.goto('/');
  await expectHeroReady(page);
  for (const kind of ['Outline', 'Dotted', 'Wireframe', 'Hologram', 'Paper', 'Cinematic']) {
    await page.getByRole('group', { name: 'Globe style', exact: true }).getByRole('button', { name: kind, exact: true }).click();
    await expectHeroReady(page);
    await expect(page.getByRole('group', { name: 'Globe style', exact: true }).getByRole('button', { name: kind, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
    await expect(page.locator('.home-globe-canvas canvas')).toHaveCount(1);
  }
  await page.getByRole('group', { name: 'Cinematic theme' }).getByRole('button', { name: 'Dawn', exact: true }).click();
  await expectHeroReady(page);
  await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save PNG', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('globio-cinematic.png');
  const png = await readFile((await download.path())!);
  expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(1000);
  await expect(page.getByText('Your PNG is ready.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('all five data modes update one globe with accessible keyboard controls', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await observeBrowser(page);
  await page.goto('/');
  await expectHeroReady(page);
  const section = page.locator('#data');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText('Live example', { exact: true })).toBeVisible({ timeout: 60_000 });
  const initialContexts = await contextCounts(page);
  expect(initialContexts.live).toBe(2);
  await section.getByRole('group', { name: 'Route origin', exact: true }).getByRole('button', { name: /Tokyo/ }).click();
  await expect(section.getByText('12 cities · 11 routes from Tokyo', { exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Pause routes', exact: true }).click();
  await expect(section.getByText('Animation paused', { exact: true })).toBeVisible();
  const routes = section.getByRole('tab', { name: 'Routes', exact: true });
  await routes.focus();
  await routes.press('ArrowRight');
  await expect(section.getByRole('tab', { name: 'Country data', exact: true })).toBeFocused();
  await expect(section.getByRole('heading', { name: 'Numbers become geography.' })).toBeVisible();
  await section.getByRole('tab', { name: 'Bars', exact: true }).click();
  await expect(section.getByText('12 city values · scale 0–100', { exact: true })).toBeVisible();
  await section.getByRole('tab', { name: 'Heatmap', exact: true }).click();
  await section.getByRole('button', { name: 'Broad reach', exact: true }).click();
  await expect(section.getByText('0.24 rad', { exact: true })).toBeVisible();
  await section.getByRole('tab', { name: 'Stories', exact: true }).click();
  await section.getByRole('list', { name: 'Choose a story scene' }).getByRole('button', { name: /Tokyo/ }).click();
  await expect(section.getByText('4 / 6 · Tokyo', { exact: true })).toBeVisible();
  await expect(section.locator('code')).toHaveText("globe.goToScene('tokyo')");
  await section.getByRole('tab', { name: 'Stories', exact: true }).press('Home');
  await expect(routes).toBeFocused();
  await expect(routes).toHaveAttribute('aria-selected', 'true');
  expect((await contextCounts(page)).created).toBe(initialContexts.created);
  expect(errors).toEqual([]);
});

test('without WebGL, posters and documentation remain usable and retry is safe', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
      if (String(args[0]).includes('webgl')) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByText('Showing a preview. Explore this style in Studio.', { exact: true })).toBeVisible();
  await expect(page.locator('.home-globe-poster')).toBeVisible();
  expect(await page.locator('.home-globe-poster').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(page.getByRole('button', { name: 'Save PNG', exact: true })).toBeDisabled();
  const section = page.locator('#data');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText('Preview unavailable', { exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Try live preview again', exact: true }).click();
  await expect(section.getByText('Preview unavailable', { exact: true })).toBeVisible();
  await section.getByRole('link', { name: 'Build with arcs' }).click();
  await expect(page).toHaveURL(/\/docs\/data\/arcs$/);
  await expect(page.getByText('The live preview could not start.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Try preview again', exact: true }).click();
  await expect(page.getByText('The live preview could not start.', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
