import { test, expect, devices } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expectHeroReady, metrics, observeBrowser } from './observability';

for (const profile of ['desktop', 'mobile-emulated'] as const) {
  test(`performance sample: ${profile}`, async ({ browser }, testInfo) => {
    test.setTimeout(180_000);
    const context = await browser.newContext(profile === 'desktop'
      ? { viewport: { width: 1440, height: 1000 } }
      : { ...devices['Pixel 7'] });
    const page = await context.newPage();
    page.on('console', (message) => { if (message.type() === 'error') console.error(message.text()); });
    await observeBrowser(page);
    if (profile === 'mobile-emulated') {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8,
      });
    }
    try {
      await page.goto(String(testInfo.project.use.baseURL), { waitUntil: 'domcontentloaded' });
      await expectHeroReady(page);
      // A fixed post-ready observation window makes repeated samples comparable.
      await page.waitForTimeout(3_000);
      const sample = { profile, cpuSlowdown: profile === 'desktop' ? 1 : 4, network: profile === 'desktop' ? 'local unthrottled' : '1.6 Mbps down / 750 Kbps up / 150 ms RTT', ...await metrics(page) };
      await testInfo.attach(`${profile}-metrics`, { body: JSON.stringify(sample, null, 2), contentType: 'application/json' });
      const label = (process.env.GLOBIO_PERF_LABEL ?? 'latest').replace(/[^a-zA-Z0-9_-]/g, '-');
      const folder = resolve('output/playwright/performance');
      await mkdir(folder, { recursive: true });
      await writeFile(resolve(folder, `${label}-${profile}.json`), `${JSON.stringify(sample, null, 2)}\n`);
      expect(sample.navigationToGlobeReadyMs).not.toBeNull();
      expect(sample.contextToGlobeReadyMs).toBeGreaterThan(0);
      // Homepage never loads editor-only code before navigation.
      expect(sample.resources.some((resource) => /\/Studio-[^/]+\.js$/.test(resource.path))).toBe(false);
      await page.screenshot({ path: testInfo.outputPath(`${profile}.png`) });
      console.log(JSON.stringify({ ...sample, resources: undefined, userAgent: undefined }));
    } finally {
      await context.close();
    }
  });
}
