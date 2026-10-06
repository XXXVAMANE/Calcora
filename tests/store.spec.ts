import { test, expect } from '@playwright/test';

test('English default, Russian switch, and matching translated detail pages',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','en');
  await expect(page.locator('h1')).toHaveCount(1);
  await page.locator('.language-switch').getByRole('link',{name:'RU',exact:true}).click();
  await expect(page).toHaveURL(/\/ru\/$/);
  await expect(page.locator('h1')).toContainText('Большие вопросы.');
  await page.goto('/ru/calculators/finance/');
  await expect(page.locator('h1')).toHaveText('Финансовый планировщик');
  await page.locator('.language-switch').getByRole('link',{name:'EN',exact:true}).click();
  await expect(page).toHaveURL(/\/calculators\/finance\/$/);
  await expect(page.locator('h1')).toHaveText('Finance Planner');
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('catalog filters show the intended tools',async({page})=>{
  await page.goto('/');
  await page.locator('[data-filter="finance"]').click();
  await expect(page.locator('[data-tool-card]:visible')).toHaveCount(1);
  await expect(page.locator('[data-tool-card]:visible h3')).toHaveText('Finance Planner');
  await expect(page.locator('#catalog-count')).toHaveText('1 calculator');
  await page.locator('[data-filter="everyday"]').click();
  await expect(page.locator('[data-tool-card]:visible')).toHaveCount(2);
  await page.locator('[data-filter="all"]').click();
  await expect(page.locator('[data-tool-card]:visible')).toHaveCount(4);
});

test('scientific calculations, invalid input, and clear AI configuration state',async({page})=>{
  await page.goto('/');
  const trigger=page.locator('[data-tool-card] [data-open-tool="scientific"]');
  await trigger.click();
  const panel=page.locator('[data-calculator="scientific"]');
  await expect(panel.locator('[data-result]')).toHaveText('20');
  await page.locator('#expression').fill('2^3^2');
  await panel.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(panel.locator('[data-result]')).toHaveText('512');
  await page.locator('#expression').fill('2 3');
  await panel.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(panel.locator('[data-calc-error]')).toBeVisible();
  await expect(panel.locator('[data-result-box]')).toBeHidden();
  await page.locator('#expression').fill('sin(pi/2)');
  await panel.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(panel.locator('[data-result]')).toHaveText('1');
  await panel.getByRole('button',{name:'Explain with AI',exact:true}).click();
  await expect(panel.locator('[data-ai-response]')).toContainText('not connected yet');
  await page.keyboard.press('Escape');
  await expect(page.locator('#calculator-dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('finance, percentage, and unit conversion produce real results',async({page})=>{
  await page.goto('/');
  await page.locator('.scene-product').click();
  const finance=page.locator('[data-calculator="finance"]');
  await expect(finance.locator('[data-result]')).toHaveText('$38,820.57');
  await page.locator('#finance-rate').fill('0');
  await finance.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(finance.locator('[data-result]')).toHaveText('$30,000.00');
  await page.locator('[data-tool-tab="percentage"]').click();
  const percent=page.locator('[data-calculator="percentage"]');
  await page.locator('#percentage-percent').fill('15');
  await page.locator('#percentage-amount').fill('200');
  await percent.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(percent.locator('[data-result]')).toHaveText('30');
  await page.locator('[data-tool-tab="converter"]').click();
  const converter=page.locator('[data-calculator="converter"]');
  await expect(converter.locator('[data-result]')).toHaveText('16.09344 km');
  await page.locator('#unit-type').selectOption('temperature');
  await page.locator('#unit-value').fill('0');
  await converter.getByRole('button',{name:'Calculate',exact:true}).click();
  await expect(converter.locator('[data-result]')).toHaveText('32 °F');
});

test('pricing toggle and paid-plan buttons explain the demo',async({page})=>{
  await page.goto('/');
  await page.locator('[data-billing="yearly"]').click();
  await expect(page.locator('[data-price-monthly="12"]')).toHaveText('$9.60');
  await expect(page.locator('[data-price-monthly="29"]')).toHaveText('$23.20');
  await expect(page.locator('[data-billing-note]').first()).toHaveText('billed annually');
  await page.locator('[data-plan="Pro"]').click();
  await expect(page.locator('#plan-dialog')).toBeVisible();
  await expect(page.locator('#plan-dialog')).toContainText('No payment is collected');
  await page.locator('#plan-dialog [data-open-tool]').click();
  await expect(page.locator('#plan-dialog')).not.toBeVisible();
  await expect(page.locator('#calculator-dialog')).toBeVisible();
});

test('Russian calculator and mobile layout',async({page},testInfo)=>{
  await page.goto('/ru/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(testInfo.project.name==='mobile'){
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await page.locator('#mobile-nav a').first().click();
    await expect(page.locator('#mobile-nav')).toBeHidden();
  }
  await page.locator('[data-tool-card] [data-open-tool="percentage"]').click();
  const panel=page.locator('[data-calculator="percentage"]');
  await expect(panel.getByRole('button',{name:'Посчитать',exact:true})).toBeVisible();
  await expect(panel.locator('[data-result]')).toHaveText('120');
  await expect(page.locator('#calculator-title')).toHaveText('Давайте посчитаем.');
});

test('static SEO, structured data, assets and not-found status',async({page,request})=>{
  for(const path of ['/','/ru/','/calculators/scientific/','/ru/calculators/finance/','/privacy/','/ru/privacy/']){
    const response=await page.goto(path);expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow');
    expect(JSON.parse(await page.locator('script[type="application/ld+json"]').textContent()||'{}')['@context']).toBe('https://schema.org');
    expect(await page.locator('link[hreflang="en"]').getAttribute('href')).toBeTruthy();
    expect(await page.locator('link[hreflang="ru"]').getAttribute('href')).toBeTruthy();
  }
  expect((await request.get('/og-cover.png')).status()).toBe(200);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  expect((await request.get('/not-a-page/')).status()).toBe(404);
  expect((await request.get('/ru/not-a-page/')).status()).toBe(404);
});
