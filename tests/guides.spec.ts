import { test, expect } from '@playwright/test';

test('device walkthrough uses prepared screens without promising model integrations or making AI requests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/');
  const demo = page.locator('[data-concept-demo]');
  await demo.locator('[data-concept-step="4"]').click();
  await expect(demo.locator('[data-concept-screen="4"]')).toBeVisible();
  await expect(demo.locator('[data-concept-screen="0"]')).toBeHidden();
  await demo.locator('[data-concept-step="3"]').click();
  await expect(demo.locator('[data-concept-screen="3"]')).toContainText('CAMERA: REAR');
  await expect(demo.locator('input[name="concept-model"]')).toHaveCount(0);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('buying guides connect to actual product pages and preserve language and SEO', async ({ page }) => {
  await page.goto('/guides/casio-fx-300es-plus-vs-fx-991cw/');
  await expect(page.locator('h1')).toContainText('fx-300ES PLUS vs fx-991CW');
  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute('href', 'https://numvori.com/guides/casio-fx-300es-plus-vs-fx-991cw/');
  const schema = await page.locator('script[type="application/ld+json"]').textContent();
  const graph = JSON.parse(schema!)['@graph'];
  expect(graph.map((node: { '@type': string }) => node['@type'])).toEqual(['Article', 'BreadcrumbList']);
  await page.locator('.language-switch').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/guides\/casio-fx-300es-plus-vs-fx-991cw\//);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('h1')).toContainText('что выбрать');
  await page.locator('a[href="/ru/products/casio-fx-991cw/"]').first().click();
  await expect(page.locator('h1')).toHaveText('fx-991CW');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
