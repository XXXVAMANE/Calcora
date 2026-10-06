import { test, expect, type Page } from '@playwright/test';

const project = 'https://calcora-test.supabase.co';
const configured = process.env.PUBLIC_SUPABASE_URL === project && process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY === 'sb_publishable_test';
const user = { id: 'c041f03d-2829-44f5-91ba-a4819e601fd5', aud: 'authenticated', role: 'authenticated', email: 'person@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
const token = () => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, role: 'authenticated' })).toString('base64url'), 'test-signature'].join('.');
const session = () => ({ access_token: token(), token_type: 'bearer', expires_in: 3600, refresh_token: 'test-refresh-token', user });
async function mockAuth(page: Page, rejectLogin = false) {
  // Prevent accidental calls to a real project when a developer uses a mismatched build.
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.route(`${project}/auth/v1/**`, async route => {
    const url = new URL(route.request().url());
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'x-supabase-api-version', 'x-supabase-api-version': '2024-01-01' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/token')) {
      return route.fulfill({ status: rejectLogin ? 400 : 200, headers, json: rejectLogin ? { code: 'invalid_credentials', msg: 'Invalid login credentials' } : session() });
    }
    if (url.pathname.endsWith('/signup')) return route.fulfill({ headers, json: user });
    if (url.pathname.endsWith('/recover')) return route.fulfill({ headers, json: {} });
    if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204, headers });
    if (url.pathname.endsWith('/user')) return route.fulfill({ headers, json: user });
    return route.fulfill({ status: 404, headers, json: {} });
  });
}

test('account routes are localized, noindex, responsive and honest without configuration', async ({ page }) => {
  if (configured) await mockAuth(page);
  await page.goto('/account/');
  await expect(page.locator('h1')).toHaveText('Your space to think.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  if (!configured) {
    await expect(page.locator('[data-auth-status]')).toContainText('not connected yet');
    await expect(page.locator('[data-auth-form]')).toBeHidden();
  }
  await page.locator('.language-switch').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page).toHaveURL(/\/ru\/account\/$/);
  await expect(page.locator('h1')).toHaveText('Ваше пространство для идей.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('email sign-in persists across refresh and language switching; sign-out clears it', async ({ page }) => {
  test.skip(!configured, 'Run with fake Supabase build configuration for mocked auth flows');
  await mockAuth(page);
  await page.goto('/account/');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.locator('[data-auth-submit]').click();
  await expect(page.locator('[data-user-email]')).toHaveText(user.email);
  await expect(page.locator('[data-auth-profile]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-auth-profile]')).toBeVisible();
  await page.locator('.language-switch').getByRole('link', { name: 'RU', exact: true }).click();
  await expect(page.locator('[data-user-email]')).toHaveText(user.email);
  await page.locator('[data-auth-signout]').click();
  await expect(page.locator('[data-auth-form]')).toBeVisible();
  await page.reload();
  await expect(page.locator('[data-auth-profile]')).toBeHidden();
});

test('registration confirms matching passwords and explains email verification', async ({ page }) => {
  test.skip(!configured, 'Requires mocked auth configuration');
  await mockAuth(page); await page.goto('/account/');
  await page.locator('[data-auth-mode="signup"]').click();
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByLabel('Confirm password').fill('different-password');
  await page.locator('[data-auth-submit]').click();
  await expect(page.locator('[data-auth-status]')).toHaveText('The passwords do not match.');
  await page.getByLabel('Confirm password').fill('test-password');
  const outgoing = page.waitForRequest(`${project}/auth/v1/signup*`);
  await page.locator('[data-auth-submit]').click();
  const sent = await outgoing;
  expect(new URL(sent.url()).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4322/account/');
  await expect(page.locator('[data-auth-status]')).toContainText('Check your inbox');
  await expect(page.locator('[data-auth-profile]')).toBeHidden();
});

test('invalid sign-in and password recovery return useful messages', async ({ page }) => {
  test.skip(!configured, 'Requires mocked auth configuration');
  await mockAuth(page, true); await page.goto('/account/');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill('bad-password');
  await page.locator('[data-auth-submit]').click();
  await expect(page.locator('[data-auth-status]')).toContainText('Check your email and password');
  await page.locator('[data-auth-forgot]').click();
  await page.locator('[data-auth-submit]').click();
  await expect(page.locator('[data-auth-status]')).toContainText('a password reset link');
});

test('recovery email callback accepts a new password and removes tokens from the URL', async ({ page }) => {
  test.skip(!configured, 'Requires mocked auth configuration');
  await mockAuth(page);
  await page.goto(`/account/#access_token=${token()}&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer&type=recovery`);
  await expect(page.locator('[data-auth-submit]')).toHaveText('Set new password');
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Password', { exact: true }).fill('new-test-password');
  await page.getByLabel('Confirm password').fill('new-test-password');
  const update = page.waitForRequest(request => request.url() === `${project}/auth/v1/user` && request.method() === 'PUT');
  await page.locator('[data-auth-submit]').click();
  expect((await update).postDataJSON()).toMatchObject({ password: 'new-test-password' });
  await expect(page.locator('[data-auth-status]')).toHaveText('Your password has been updated.');
});
