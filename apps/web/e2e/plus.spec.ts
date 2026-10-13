import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a free family sees Plus features with a reason instead of losing them', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  await page
    .locator('#settings-baby')
    .getByRole('button', { name: /Add a baby/ })
    .click();
  const sheet = page.getByRole('dialog', { name: 'Babble Plus' });
  await expect(sheet).toContainText('Adding more than one baby to a family is part of Babble Plus.');
  await expect(sheet.getByRole('button', { name: 'Subscribe to Plus' })).toBeDisabled();
  await sheet.getByRole('button', { name: 'Not now' }).click();

  await page.getByRole('button', { name: /Invite someone/ }).click();
  await expect(page.getByRole('dialog', { name: 'Babble Plus' })).toContainText('A free family can have two carers');
  await page.getByRole('dialog', { name: 'Babble Plus' }).getByRole('button', { name: 'Not now' }).click();

  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByRole('dialog', { name: 'Chair mode preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('button', { name: /Open chair mode/ }).click();
  await expect(page.getByRole('dialog', { name: 'Babble Plus' })).toContainText('Chair mode is part of Babble Plus');
  await page.getByRole('dialog', { name: 'Babble Plus' }).getByRole('button', { name: 'Not now' }).click();
  await page.goto('/chair');
  await expect(page.getByRole('heading', { name: 'Chair mode' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start left' })).toHaveCount(0);

  await page.goto('/');
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.goto('/stats?range=all');
  await expect(page.getByRole('heading', { name: 'All-time stats' })).toBeVisible();
  await page.goto('/timeline?view=30d');
  await expect(page.getByRole('heading', { name: '30-day timeline' })).toBeVisible();
  await page.getByRole('button', { name: 'See what Plus adds' }).click();
  await expect(page.getByRole('dialog', { name: 'Babble Plus' })).toContainText('30-day timeline');
});
