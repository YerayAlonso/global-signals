import { expect, test } from '@playwright/test';
import snapshot from '../../src/data/snapshot.json' with { type: 'json' };

test.beforeEach(async ({ page }) => {
  // Keep UI tests deterministic and independent of the upstream's availability.
  await page.route('**/api/stats?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    await route.fulfill({ json: { ...snapshot, metric: params.get('metric'), region: params.get('region'), device: params.get('metric') === 'platform' ? 'all' : params.get('device') } });
  });
});

test('TeeChart renders and supports filters, legends, table search and downloads', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.chart-placeholder')).toHaveCount(0);
  await expect(page.locator('.analytics')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.kpi-card')).toHaveCount(4);
  await expect(page.locator('.kpi-card').first()).toContainText('66.45');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toHaveText('The digital world, in perspective.');
  await expect(page.locator('.period-note')).toContainText('September 2026');
  await expect.poll(() => page.evaluate(() => !!window.Tee)).toBe(true);
  const painted = await page.locator('canvas').evaluate(canvas => {
    const c = canvas as HTMLCanvasElement;
    const pixels = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > 160 && pixels[i] < 100) count++;
    return count;
  });
  expect(painted).toBeGreaterThan(500);
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  const legend = page.locator('.chart-legend').getByRole('button', { name: /Chrome/ });
  await legend.click(); await expect(legend).toHaveAttribute('aria-pressed', 'false');
  await legend.click(); await expect(legend).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Comparison', exact: true }).click();
  await expect(page.locator('#chart-title')).toHaveText('A snapshot of today');
  await expect(page.locator('.chart-placeholder')).toHaveCount(0);
  await page.locator('#market-chart').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.chart-tooltip')).toContainText('Safari');
  await page.keyboard.press('Escape');
  await expect(page.locator('.chart-tooltip')).toHaveCount(0);
  await page.getByLabel('Period', { exact: true }).selectOption('6');
  await expect(page).toHaveURL(/months=6/);
  await page.getByRole('button', { name: 'Monthly history' }).click();
  await expect(page.locator('thead th')).toHaveCount(8);
  await page.getByLabel('Search the data', { exact: true }).fill('Safari');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await csv).suggestedFilename()).toContain('.csv');
  const png = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download chart as PNG' }).click();
  expect((await png).suggestedFilename()).toContain('.png');
  await page.getByLabel('Region', { exact: true }).selectOption('ES');
  await expect(page.locator('.section-heading')).toContainText('Spain');
  expect(errors).toEqual([]);
});

test('shared links restore the filters and monthly history', async ({ page }) => {
  await page.goto('/?metric=os&region=ES&device=mobile&months=24&view=bar');
  await expect(page.getByLabel('Region', { exact: true })).toHaveValue('ES');
  await expect(page.getByLabel('Device', { exact: true })).toHaveValue('mobile');
  await expect(page.getByLabel('Period', { exact: true })).toHaveValue('24');
  await expect(page.locator('.section-heading')).toContainText('Operating systems');
  await expect(page.locator('#chart-title')).toContainText('A snapshot');
});

test('dark mode follows the system preference and remembers an explicit choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.chart-placeholder')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
  await expect.poll(() => page.locator('.filter-panel').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(17, 27, 44)');
  await page.screenshot({ path: test.info().outputPath('dashboard-dark.png'), fullPage: true });

  await page.getByRole('button', { name: 'Switch to light mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => localStorage.getItem('global-signals-theme'))).toBe('light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Switch to dark mode' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('global-signals-theme'))).toBe('dark');
});

test('mobile layout has no page overflow and the navigation and modal work', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.chart-placeholder')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/is-open/);
  await page.getByRole('button', { name: 'Devices', exact: true }).click();
  await expect(page.getByLabel('Device', { exact: true })).toBeDisabled();
  await expect(page.locator('.sidebar')).not.toHaveClass(/is-open/);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.getByRole('button', { name: 'Methodology', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('24 complete months');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('upstream failures keep the previous data and display an explicit error', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.analytics')).toHaveAttribute('aria-busy', 'false');
  await page.route('**/api/stats?**', route => route.fulfill({ status: 502, json: { error: 'StatCounter is not responding.' } }));
  await page.getByLabel('Region', { exact: true }).selectOption('ES');
  await expect(page.getByRole('alert')).toContainText('StatCounter is not responding');
  await expect(page.locator('.section-heading')).toContainText('Worldwide');
  await expect(page.locator('.kpi-card').first()).toContainText('66.45');
});
