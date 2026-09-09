import { test, expect, type Download } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { contextCounts, expectHeroReady, expectStudioReady, observeBrowser } from './observability';

const contents = async (download: Download) => readFile((await download.path())!, 'utf8');

test('selected world opens in Studio, exports usable files, and restores a reviewed project', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requests.push(request.url()));
  await observeBrowser(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expectHeroReady(page);
  await page.getByRole('group', { name: 'Globe style', exact: true }).getByRole('button', { name: 'Outline', exact: true }).click();
  await expectHeroReady(page);
  await page.getByRole('group', { name: 'Outline theme', exact: true }).getByRole('button', { name: 'Cyber', exact: true }).click();
  await expectHeroReady(page);
  await page.getByRole('link', { name: 'Create your world', exact: false }).click();
  await expect(page).toHaveURL(/\/studio\?/);
  const url = new URL(page.url());
  expect(url.searchParams.get('kind')).toBe('outline');
  expect(url.searchParams.get('theme')).toBe('outline-cyber');
  expect(url.searchParams.get('layer')).toBe('none');
  await expectStudioReady(page);
  await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
  // A plain globe must not fetch inactive public heatmap datasets.
  expect(requests.some((request) => /earthquake\.usgs\.gov|earthquakes\.geojson|population\.json/.test(request))).toBe(false);

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Take your globe with you' });
  await expect(dialog).toBeVisible();
  const configEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Download config', exact: true }).click();
  const configDownload = await configEvent;
  expect(configDownload.suggestedFilename()).toBe('globe-config.json');
  const config = JSON.parse(await contents(configDownload));
  expect(config.globe.kind).toBe('outline');
  expect(config.globe.theme).toBe('outline-cyber');
  expect(config.dataLayer).toBeNull();
  for (const framework of ['Vanilla', 'React', 'Vue', 'Angular']) {
    await dialog.getByRole('tab', { name: framework, exact: true }).click();
    const code = dialog.getByLabel(`${framework} integration code`, { exact: true });
    await expect(code).toContainText('globe-config.json');
    const codeEvent = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Download code', exact: true }).click();
    const downloaded = await contents(await codeEvent);
    expect(downloaded).toBe(await code.textContent());
  }
  await dialog.getByRole('tab', { name: 'Studio project', exact: true }).click();
  const projectEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save project', exact: true }).click();
  const projectDownload = await projectEvent;
  expect(projectDownload.suggestedFilename()).toBe('globio-outline.studio.json');
  const projectText = await contents(projectDownload);
  const project = JSON.parse(projectText);
  expect(project.format).toBe('globio-studio');
  expect(project.state.globe.kind).toBe('outline');
  expect(project.state.globe.theme).toBe('outline-cyber');
  await page.keyboard.press('Escape');

  // The import is not a no-op: change the current scene before restoring it.
  await page.getByRole('link', { name: 'Back to Globio home' }).click();
  await expectHeroReady(page);
  await page.getByRole('link', { name: 'Create your world', exact: false }).click();
  await expectStudioReady(page);
  await page.getByRole('button', { name: 'Open project', exact: true }).click();
  const importer = page.getByRole('dialog', { name: 'Open a Studio project' });
  await importer.getByRole('textbox', { name: 'Project JSON' }).fill('{ broken json');
  await importer.getByRole('button', { name: 'Review project', exact: true }).click();
  await expect(importer.getByRole('alert')).toBeVisible();
  await expect(importer.getByRole('button', { name: 'Open project', exact: true })).toHaveCount(0);
  await importer.getByLabel('Choose JSON file').setInputFiles({ name: 'saved.studio.json', mimeType: 'application/json', buffer: Buffer.from(projectText) });
  await expect(importer.getByRole('textbox', { name: 'Project JSON' })).toHaveValue(projectText);
  await importer.getByRole('button', { name: 'Review project', exact: true }).click();
  await expect(importer.getByText('Ready to open', { exact: true })).toBeVisible();
  await expect(importer.getByText('outline-cyber', { exact: true })).toBeVisible();
  await importer.getByRole('button', { name: 'Open project', exact: true }).click();
  await expect(importer).toHaveCount(0);
  await expectStudioReady(page);
  await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await dialog.getByRole('tab', { name: 'Studio project', exact: true }).click();
  const restoredEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save project', exact: true }).click();
  const restored = JSON.parse(await contents(await restoredEvent));
  expect(restored.state).toEqual(project.state);
  expect(restored.customThemes).toEqual(project.customThemes);
  await page.keyboard.press('Escape');

  for (let index = 0; index < 2; index++) {
    await page.getByRole('link', { name: 'Back to Globio home' }).click();
    await expectHeroReady(page);
    await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
    expect((await contextCounts(page)).detached).toBe(0);
    await page.getByRole('link', { name: 'Create your world', exact: false }).click();
    await expectStudioReady(page);
    await expect.poll(async () => (await contextCounts(page)).live).toBe(1);
    expect((await contextCounts(page)).detached).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('opening a snapshotless heatmap project twice reloads the data and leaves export usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/studio?kind=outline&theme=outline-dark&layer=none');
  await expectStudioReady(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const exporter = page.getByRole('dialog', { name: 'Take your globe with you' });
  await exporter.getByRole('tab', { name: 'Studio project', exact: true }).click();
  const sourceEvent = page.waitForEvent('download');
  await exporter.getByRole('button', { name: 'Save project', exact: true }).click();
  const project = JSON.parse(await contents(await sourceEvent));
  project.state.activeLayer = 'heatmap';
  project.state.heatmap.dataset = 'countries';
  // Exercise dataset loading/restoration with a small real heatmap. Country-dome
  // tessellation is unrelated to this regression and costly on software GPUs.
  Object.assign(project.state.heatmap, {
    surfaceMode: 'smooth', detailMode: 'clean', meshLevel: 0, textureLevel: 0, animationEnabled: false,
  });
  delete project.heatmapData;
  await page.keyboard.press('Escape');

  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: 'Open project', exact: true }).click();
    const importer = page.getByRole('dialog', { name: 'Open a Studio project' });
    await importer.getByRole('textbox', { name: 'Project JSON', exact: true }).fill(JSON.stringify(project));
    await importer.getByRole('button', { name: 'Review project', exact: true }).click();
    await importer.getByRole('button', { name: 'Open project', exact: true }).click();
    await expect(importer).toHaveCount(0);
    await expectStudioReady(page);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(exporter.getByRole('button', { name: 'Download config', exact: true })).toBeEnabled();
    await exporter.getByRole('tab', { name: 'Studio project', exact: true }).click();
    const snapshotEvent = page.waitForEvent('download');
    await exporter.getByRole('button', { name: 'Save project', exact: true }).click();
    const saved = JSON.parse(await contents(await snapshotEvent));
    expect(saved.heatmapData.length).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  }
  expect(errors).toEqual([]);
});
