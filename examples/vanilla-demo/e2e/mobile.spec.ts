import { test, expect } from '@playwright/test';
import { contextCounts, expectHeroReady, expectStudioReady, observeBrowser } from './observability';

test('mobile and reduced motion keep globe choices, data controls and navigation usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await observeBrowser(page);
  await page.goto('/');
  await expectHeroReady(page);
  await expect(page.locator('.home-hero-journey')).toHaveAttribute('data-animated', 'false');
  await expect(page.getByRole('button', { name: 'Globe animation disabled for reduced motion' })).toBeDisabled();
  await page.locator('.home-mobile-preview').getByRole('combobox', { name: 'Globe style' }).selectOption('outline');
  await expectHeroReady(page);
  await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
  const section = page.locator('#data');
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText('Reduced motion', { exact: true })).toBeVisible({ timeout: 60_000 });
  await section.getByRole('combobox', { name: 'Route origin', exact: true }).selectOption('tokyo');
  await expect(section.getByText('12 cities · 11 routes from Tokyo', { exact: true })).toBeVisible();
  await section.getByRole('tab', { name: 'Stories', exact: true }).click();
  await section.getByRole('combobox', { name: 'Story stop', exact: true }).selectOption('sydney');
  await expect(section.getByText('5 / 6 · Sydney', { exact: true })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('mobile Studio keeps project controls and export dialog within the viewport', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio?kind=paper&theme=paper-default&layer=none');
  await expectStudioReady(page);
  const exportButton = page.getByRole('button', { name: 'Export', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Take your globe with you' });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(exportButton).toBeInViewport();
    await exportButton.click();
    await expect(dialog).toBeInViewport();
    const bounds = (await dialog.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
    await dialog.getByRole('tab', { name: 'Angular', exact: true }).click();
    await expect(dialog.getByLabel('Angular integration code', { exact: true })).toContainText('globe-config.json');
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const copy = dialog.getByRole('button', { name: 'Copy code', exact: true });
    await copy.scrollIntoViewIfNeeded();
    const copyBounds = (await copy.boundingBox())!;
    expect(copyBounds.x).toBeGreaterThanOrEqual(0);
    expect(copyBounds.y).toBeGreaterThanOrEqual(0);
    expect(copyBounds.x + copyBounds.width).toBeLessThanOrEqual(width + 1);
    expect(copyBounds.y + copyBounds.height).toBeLessThanOrEqual(845);
    await dialog.getByRole('tab', { name: 'Studio project', exact: true }).click();
    await expect(dialog.getByText('paper-default', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save project', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(exportButton).toBeFocused();
  }
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Project JSON', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
