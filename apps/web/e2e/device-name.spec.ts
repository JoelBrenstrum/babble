import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('entries remember the device they were logged on', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('device', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  await page.getByLabel('Device name').fill('Kitchen tablet');
  await expect(page.getByText('Shown on entries logged here, like "Logged by John on Kitchen tablet".')).toBeVisible();

  await page.goto('/track/nappy/new');
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.goto('/track/nappy');
  await page.getByRole('link', { name: /Wet/ }).first().click();
  await expect(page.getByText(/Logged by John on Kitchen tablet/)).toBeVisible();
});
