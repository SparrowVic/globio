import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { contextCounts, expectStudioReady, observeBrowser } from './observability';

const backgroundClear = (page: Page) => page.locator('[data-studio-globe-host] canvas').evaluate((canvas: HTMLCanvasElement) => {
  const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
  const value = gl && !gl.isContextLost() ? gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array | null : null;
  return value ? Array.from(value) : null;
});

async function expectBackgroundChanged(page: Page, previous: number[] | null) {
  await expect.poll(async () => {
    if (await page.getByTestId('studio-status').getAttribute('data-ready') !== 'true') return false;
    const current = await backgroundClear(page);
    return current !== null && JSON.stringify(current) !== JSON.stringify(previous);
  }).toBe(true);
}

test('custom theme changes preview live, keep the draft, and survive export and cancel', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await observeBrowser(page);
  await page.goto('/studio?kind=wireframe&theme=wireframe-tron&layer=none');
  await expectStudioReady(page);
  await page.getByRole('button', { name: 'More Studio actions' }).click();
  await page.getByRole('menuitem', { name: 'Create custom theme', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Create custom theme', exact: true });
  await editor.getByRole('textbox', { name: 'Name', exact: true }).fill('Night transit');
  await expectStudioReady(page);
  const before = await backgroundClear(page);
  await editor.getByLabel('Background color', { exact: true }).fill('#102030');
  await expectBackgroundChanged(page, before);
  const firstChange = await backgroundClear(page);
  await editor.getByLabel('Background color', { exact: true }).fill('#24364a');
  await expectBackgroundChanged(page, firstChange);
  await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
  await expect(editor.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Night transit');
  await editor.getByRole('button', { name: 'Save theme', exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expectStudioReady(page);

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exporter = page.getByRole('dialog', { name: 'Take your globe with you' });
  await exporter.getByRole('tab', { name: 'Studio project', exact: true }).click();
  const projectEvent = page.waitForEvent('download');
  await exporter.getByRole('button', { name: 'Save project', exact: true }).click();
  const project = JSON.parse(await readFile((await (await projectEvent).path())!, 'utf8'));
  const theme = project.customThemes.find((entry: { id: string }) => entry.id === project.state.globe.theme);
  expect(theme.name).toBe('Night transit');
  expect(theme.tokens['background.color']).toBe('#24364a');
  // These unedited, kind-specific tokens are absent from the small editor.
  expect(theme.tokens['wireframe.color']).toBe('#22d3ee');
  expect(theme.tokens['wireframe.density']).toBe(1.2);
  await exporter.getByRole('tab', { name: 'Use in app', exact: true }).click();
  const runtimeEvent = page.waitForEvent('download');
  await exporter.getByRole('button', { name: 'Download config', exact: true }).click();
  const runtime = JSON.parse(await readFile((await (await runtimeEvent).path())!, 'utf8'));
  expect(runtime.globe.theme.tokens).toEqual(theme.tokens);
  await page.keyboard.press('Escape');
  const savedBackground = await backgroundClear(page);

  await page.getByRole('button', { name: 'More Studio actions' }).click();
  await page.getByRole('menuitem', { name: 'Manage saved themes & presets', exact: true }).click();
  await page.getByRole('dialog', { name: 'Manage saved', exact: true }).getByRole('button', { name: 'Edit Night transit', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit custom theme', exact: true });
  await expect(edit.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Night transit');
  await edit.getByLabel('Background color', { exact: true }).fill('#aa2244');
  await expectBackgroundChanged(page, savedBackground);
  await edit.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(edit).toHaveCount(0);
  await expectStudioReady(page);
  await expect.poll(() => backgroundClear(page)).toEqual(savedBackground);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await exporter.getByRole('tab', { name: 'Studio project', exact: true }).click();
  await expect(exporter.getByText('Night transit', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
