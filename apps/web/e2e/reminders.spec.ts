import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('home shows when the next feed is due once reminders are on', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Log bottle' }).click();
  await page.getByRole('textbox', { name: 'Amount', exact: true }).fill('90');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.goto('/');
  await expect(page.getByText(/Next feed due/)).toHaveCount(0);

  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await page.getByRole('checkbox', { name: '3h', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: '3h', exact: true })).toHaveAttribute('aria-checked', 'true');

  await page.getByRole('link', { name: 'Home' }).filter({ visible: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Next feed due in (2h 59m|3h 00m) · around \d{1,2}:\d{2} [ap]m/ }),
  ).toBeVisible();
});
