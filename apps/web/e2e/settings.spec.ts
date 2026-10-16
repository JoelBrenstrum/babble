import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('settings keep baby, family, device and account apart', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  for (const name of ["Olivia's settings", 'Family', 'This device', 'Account']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const family = page.locator('#settings-family');
  await family.getByRole('radio', { name: /Imperial/ }).click();
  await expect(family.getByRole('radio', { name: /Imperial/, checked: true })).toBeVisible();
  await page.reload();
  await expect(family.getByRole('radio', { name: /Imperial/, checked: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });
});

test('switching babies in Settings changes whose settings are shown', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Uses the seeded family; run once.');
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as John' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();

  await page.goto('/settings');
  const babies = page.getByRole('radiogroup', { name: 'Baby' });
  await babies.getByRole('radio', { name: /Jacob/ }).click();
  await expect(page.getByRole('heading', { name: "Jacob's settings" })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Jacob');
  await babies.getByRole('radio', { name: /Olivia/ }).click();
  await expect(page.getByRole('heading', { name: "Olivia's settings" })).toBeVisible();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Olivia');
});

test('the day can start when the night ends, and follows the night end', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  await page.getByRole('radio', { name: /When the night ends/ }).click();
  await expect(page.getByLabel('Night end time')).toHaveValue('07:00');
  await page.getByLabel('Night end time').fill('06:30');
  await page.getByLabel('Night end time').blur();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.getByLabel('Night ends', { exact: true })).toHaveValue('06:30');

  await page.getByLabel('Night ends', { exact: true }).fill('05:45');
  await page.getByLabel('Night ends', { exact: true }).blur();
  await page.reload();
  await expect(page.getByLabel('Night end time')).toHaveValue('05:45');
  await page.screenshot({ path: testInfo.outputPath('day-start.png'), fullPage: true });

  await page.getByRole('radio', { name: /Midnight/ }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('radio', { name: /Midnight/, checked: true })).toBeVisible();
  await expect(page.getByLabel('Night ends', { exact: true })).toHaveValue('05:45');
});
