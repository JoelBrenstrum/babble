import { expect, test, type Page } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

function pretendNewRelease(page: Page) {
  return page.route('**/api/version', (route) => route.fulfill({ json: { release: 'a-newer-release' } }));
}

test('a refresh banner appears when a new release is out', async ({ page }) => {
  await pretendNewRelease(page);
  await page.goto('/welcome');
  const banner = page.getByRole('status').filter({ hasText: 'A new version of babble is ready.' });
  await expect(banner).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('banner.png') });
  const reloaded = page.waitForEvent('load');
  await banner.getByRole('button', { name: 'Refresh' }).click();
  await reloaded;

  await banner.getByRole('button', { name: 'Not now' }).click();
  await expect(banner).toHaveCount(0);
});

test('no banner while the release matches', async ({ page }) => {
  await page.goto('/welcome');
  await page.waitForResponse('**/api/version');
  await expect(page.getByText('A new version of babble is ready.')).toHaveCount(0);
});

test('chair mode shows its own refresh banner', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await pretendNewRelease(page);
  await page.goto('/chair');
  await expect(page.getByText('A new version of babble is ready')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
});
