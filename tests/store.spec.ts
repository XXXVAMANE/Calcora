import { test, expect } from '@playwright/test';

test('dark physical storefront has localized pages and a working language switch', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Big ideas.');
  await expect(page.locator('[data-product-card]')).toHaveCount(4);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(16, 17, 20)');
  await page.locator('.language-switch').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page.locator('h1')).toContainText('Большие идеи.');
  await page.goto('/ru/products/casio-fx-300es-plus/');
  await expect(page.locator('h1')).toHaveText('fx-300ES PLUS');
  await page.locator('.language-switch').getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/products\/casio-fx-300es-plus\/$/);
  expect(errors).toEqual([]);
});

test('physical product filters show scientific, classroom and concept models', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-shop-filter="classroom"]').click();
  await expect(page.locator('[data-product-card]:visible')).toHaveCount(2);
  await expect(page.locator('[data-shop-count]')).toHaveText('2 models');
  await page.locator('[data-shop-filter="scientific"]').click();
  await expect(page.locator('[data-product-card]:visible h3')).toHaveText('fx-991CW');
  await page.locator('[data-shop-filter="ai"]').click();
  await expect(page.locator('[data-product-card]:visible h3')).toHaveText('AI One');
  await expect(page.locator('[data-product-card]:visible [data-add-product]')).toHaveCount(0);
  await page.locator('[data-shop-filter="all"]').click();
  await expect(page.locator('[data-product-card]:visible')).toHaveCount(4);
});

test('demo bag totals, quantities, removal and checkout remain honest across languages', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-add-product="casio-fx-300es-plus"]').click();
  await expect(page.locator('[data-bag-count]')).toHaveText('1');
  await page.locator('[data-open-bag]').click();
  const bag = page.locator('#bag-dialog');
  await expect(bag).toBeVisible();
  await expect(bag.locator('[data-bag-total]')).toHaveText('$24.99');
  await bag.getByRole('spinbutton').fill('2');
  await bag.getByRole('spinbutton').press('Tab');
  await expect(bag.locator('[data-bag-total]')).toHaveText('$49.98');
  await bag.getByRole('button', { name: 'Test checkout' }).click();
  await expect(bag.locator('[data-checkout-notice]')).toContainText('no order has been placed');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-open-bag]')).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-bag-count]')).toHaveText('2');
  await page.locator('.language-switch').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page.locator('[data-bag-count]')).toHaveText('2');
  await page.locator('[data-open-bag]').click();
  await expect(bag.locator('.bag-item')).toHaveCount(1);
  await bag.getByRole('button', { name: 'Удалить: fx-300ES PLUS' }).click();
  await expect(bag.locator('[data-bag-empty]')).toBeVisible();
  await expect(page.locator('[data-bag-count]')).toHaveText('0');
});

test('invalid persisted bag data cannot add concepts or corrupt quantities', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('calcora-demo-bag', JSON.stringify([
    { slug: 'calcora-ai-one', quantity: 1 }, { slug: 'unknown', quantity: 1 },
    { slug: 'ti-30x-iis', quantity: -5 }, { slug: 'casio-fx-300es-plus', quantity: 2 },
    { slug: 'casio-fx-300es-plus', quantity: 3 },
  ])));
  await page.goto('/');
  await expect(page.locator('[data-bag-count]')).toHaveText('2');
  await page.locator('[data-open-bag]').click();
  await expect(page.locator('.bag-item')).toHaveCount(1);
  await expect(page.locator('[data-bag-total]')).toHaveText('$49.98');
});

test('online companion still calculates and reports missing AI honestly', async ({ page }) => {
  await page.goto('/');
  await page.locator('.ai-hardware [data-open-tool="scientific"]').click();
  const panel = page.locator('[data-calculator="scientific"]');
  await page.locator('#expression').fill('2^3^2');
  await panel.getByRole('button', { name: 'Calculate', exact: true }).click();
  await expect(panel.locator('[data-result]')).toHaveText('512');
  await panel.getByRole('button', { name: 'Explain with AI' }).click();
  await expect(panel.locator('[data-ai-response]')).toContainText('not connected yet');
  await page.locator('[data-tool-tab="finance"]').click();
  await expect(page.locator('[data-calculator="finance"] [data-result]')).toHaveText('$38,820.57');
  await page.locator('[data-tool-tab="percentage"]').click();
  await expect(page.locator('[data-calculator="percentage"] [data-result]')).toHaveText('120');
  await page.locator('[data-tool-tab="converter"]').click();
  await expect(page.locator('[data-calculator="converter"] [data-result]')).toHaveText('16.09344 km');
});

test('mobile navigation, product pages and translated layouts do not overflow', async ({ page }, info) => {
  for (const path of ['/', '/ru/', '/products/casio-fx-300es-plus/', '/ru/products/calcora-ai-one/', '/account/']) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  if (info.project.name === 'mobile') {
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await page.locator('#mobile-nav a').first().click();
    await expect(page.locator('#mobile-nav')).toBeHidden();
  }
});

test('physical product metadata omits fictional offers and concepts remain noindex', async ({ page, request }) => {
  await page.goto('/products/casio-fx-300es-plus/');
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() || '{}');
  expect(schema['@type']).toBe('Product');
  expect(schema.name).toBe('CASIO fx-300ES PLUS');
  expect(schema.offers).toBeUndefined();
  expect(schema.aggregateRating).toBeUndefined();
  await expect(page.locator('.product-specs')).toContainText('Built-in AINo');
  await page.goto('/products/calcora-ai-one/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('.physical-copy [data-add-product]')).toHaveCount(0);
  expect((await request.get('/og-cover.png')).status()).toBe(200);
  expect((await request.get('/not-a-page/')).status()).toBe(404);
  expect((await request.get('/ru/not-a-page/')).status()).toBe(404);
});
