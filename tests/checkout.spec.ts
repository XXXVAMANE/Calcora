import { test, expect } from '@playwright/test';
test('checkout submits only product identifiers and quantities and handles unavailable setup',async({page})=>{
 await page.goto('/ru/'); await page.locator('[data-add-product="ai-camera-calculator"]').click();await page.locator('[data-open-bag]').click();
 await page.route('**/api/checkout',async route=>{
  const body=route.request().postDataJSON();expect(body.items).toEqual([{slug:'ai-camera-calculator',quantity:1}]);expect(body.locale).toBe('ru');expect(body.attempt).toMatch(/^[a-f0-9-]{36}$/);
  await route.fulfill({status:503,json:{error:'CHECKOUT_NOT_CONFIGURED'}});
 });
 await page.getByRole('button',{name:'Тестовая оплата предзаказа',exact:true}).click();await expect(page.locator('[data-checkout-notice]')).toContainText('ещё не настроена');await expect(page.locator('[data-bag-count]')).toHaveText('1');
});
test('a successful test checkout redirects only to Stripe and preserves the matching cart snapshot',async({page})=>{
 await page.goto('/');await page.locator('[data-add-product="ai-camera-calculator"]').click();await page.locator('[data-open-bag]').click();
 await page.route('**/api/checkout',route=>route.fulfill({json:{url:'https://checkout.stripe.com/c/pay/cs_test_example',id:'cs_test_example',test:true}}));
 await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'Stripe test page'}));
 await page.getByRole('button',{name:'Test preorder checkout',exact:true}).click();await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/cs_test_example');
 await page.route('**/api/checkout?**',route=>route.fulfill({json:{paid:true,test:true,amount:28000,currency:'USD'}}));
 await page.goto('/checkout/success/?session_id=cs_test_example');await expect(page.locator('h1')).toHaveText('Test payment confirmed.');await expect(page.locator('[data-payment-total]')).toHaveText('$280.00');await expect(page.locator('[data-bag-count]')).toHaveText('0');
 await page.locator('[data-open-bag]').first().click();await expect(page.locator('[data-bag-empty]')).toBeVisible();
});
test('cancelled and unverified purchases preserve the bag; receipt pages are noindex and responsive',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('calcora-demo-bag',JSON.stringify([{slug:'ai-camera-calculator',quantity:1}])));
 await page.goto('/ru/checkout/cancel/');await expect(page.locator('h1')).toHaveText('Оплата отменена.');await expect(page.locator('[data-bag-count]')).toHaveText('1');
 await page.route('**/api/checkout?**',route=>route.fulfill({json:{paid:false,test:true,amount:28000,currency:'USD'}}));
 await page.goto('/checkout/success/?session_id=cs_test_example&paid=true');await expect(page.locator('h1')).toHaveText('Payment not confirmed.');await expect(page.locator('[data-bag-count]')).toHaveText('1');
 await expect(page.locator('meta[name=robots]')).toHaveAttribute('content','noindex, nofollow');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
