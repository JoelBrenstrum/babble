import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('pending invites show in Settings and can be revoked', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await expect(page.getByText(/1 pending/)).toBeVisible();
  await page.getByRole('button', { name: /^Revoke invite / }).click();
  await page.getByText('Revoke this invite? The code will stop working.').waitFor();
  await page.getByRole('button', { name: 'Revoke', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Revoke invite / })).toHaveCount(0);
  await expect(page.getByText(/1 pending/)).toHaveCount(0);
});
