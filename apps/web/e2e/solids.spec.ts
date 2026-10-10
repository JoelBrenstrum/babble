import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('solids can be logged with foods and a reaction, and foods are suggested next time', async ({
  page,
}, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Log solids' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Add at least one food.')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Avocado' }).click();
  await page.getByLabel('Add a food').fill('Scrambled egg');
  await page.getByLabel('Add a food').press('Enter');
  await expect(page.getByRole('checkbox', { name: 'Scrambled egg' })).toBeChecked();
  await page.getByRole('checkbox', { name: 'Some' }).click();
  await page.getByRole('checkbox', { name: 'Loved it' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page).toHaveURL(/\/track\/solids$/);
  await expect(page.getByText('Avocado, Scrambled egg')).toBeVisible();
  await expect(page.getByText('Loved it')).toBeVisible();
  await expect(page.getByText('1 meal · 2 foods')).toBeVisible();

  await page.getByRole('link', { name: 'Add solids' }).click();
  await expect(page.getByRole('checkbox').first()).toHaveAccessibleName('Avocado');
  await expect(page.getByRole('checkbox', { name: 'Scrambled egg' })).not.toBeChecked();

  await page.goto('/');
  await expect(page.getByRole('link', { name: /Solids/ }).first()).toContainText('Avocado, Scrambled egg');
});
