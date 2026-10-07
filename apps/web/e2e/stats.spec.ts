import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('stats summarise what has been logged over a range', async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Stats' }).filter({ visible: true }).click();
  await expect(page.getByText('Nothing to chart yet')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/stats');
  await expect(
    page.getByText('Showing today so far. Daily averages start once a full day has been logged.'),
  ).toBeVisible();
  for (const title of ['Sleep', 'Feeds', 'Nappies']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  }
  await expect(page.getByRole('img', { name: 'Nappies per day' })).toBeVisible();

  await page.getByRole('radio', { name: '30d' }).click();
  await expect(page).toHaveURL(/range=30d/);
  await page.getByRole('radio', { name: 'All' }).click();
  await expect(page).toHaveURL(/range=all/);
  await expect(page.getByRole('heading', { name: 'Nappies' })).toBeVisible();
});

test('growth is compared with the WHO charts once the sex is set', async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Log growth' }).click();
  await page.getByLabel('Weight (kg)').fill('4.1');
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/stats');
  const growth = page.locator('[aria-labelledby=stats-growth]');
  await expect(growth.getByText('4.10 kg')).toBeVisible();
  await expect(growth.getByText("Set Olivia's sex in")).toBeVisible();

  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Girl' }).click();
  await page.getByRole('button', { name: 'Save changes' }).first().click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.goto('/stats');
  await expect(growth.getByText(/^\d+(st|nd|rd|th) percentile$/)).toBeVisible();
  await expect(growth.getByText("Set Olivia's sex in")).toHaveCount(0);
});
