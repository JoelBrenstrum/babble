import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('the timeline shows the day and the last 7 days and opens entries', async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  for (const kind of ['Both', 'Wet', 'Dirty']) {
    await page.goto('/');
    await page.getByRole('link', { name: 'Log nappy' }).click();
    await page.getByRole('radio', { name: kind }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).not.toHaveURL(/\/new/);
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await page.getByRole('link', { name: 'Timeline' }).filter({ visible: true }).click();
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home, nap running' }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Sleep .*running$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next day' })).toHaveAttribute('aria-disabled', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('link', { name: /^Nappy .*both$/ }).click();
  await expect(page.getByRole('heading', { name: 'Nappy' })).toBeVisible();
  await page.goBack();

  await page.getByRole('radio', { name: '7d' }).click();
  await expect(page.getByRole('link', { name: /^Open / })).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'Next 7 days' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Feeds/day')).toBeVisible();
  await expect(page.getByRole('cell').filter({ hasText: /^3$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Previous 7 days' }).click();
  await expect(page.getByRole('link', { name: 'Next 7 days' })).not.toHaveAttribute('aria-disabled', 'true');
  await page
    .getByRole('link', { name: /^Open / })
    .first()
    .click();
  await expect(page.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true');
});
