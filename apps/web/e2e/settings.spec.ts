import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('settings keep baby, family, device and account apart, and switch babies in place', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  for (const name of ["Olivia's settings", 'Family', 'This device', 'Account']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const family = page.locator('#settings-family');
  await family.getByRole('radio', { name: /Imperial/ }).click();
  await expect(family.getByRole('radio', { name: /Imperial/, checked: true })).toBeVisible();

  await page.locator('#settings-baby').getByRole('link', { name: 'Add a baby' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Theo');
  await page.getByLabel('Birth date').fill('2026-10-01');
  await page.getByRole('button', { name: 'Add baby' }).click();
  await expect(page.getByText('Breastfeed')).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: "Theo's settings" })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Theo');
  await expect(family.getByRole('radio', { name: /Imperial/, checked: true })).toBeVisible();

  await page
    .getByRole('radiogroup', { name: 'Baby' })
    .getByRole('radio', { name: /Olivia/ })
    .click();
  await expect(page.getByRole('heading', { name: "Olivia's settings" })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Olivia');
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
});
