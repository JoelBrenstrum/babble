import { expect, test, type Page } from '@playwright/test';
import { backdateEvents, setSignupMode } from './db';
import { onboard, signUpWithPassword, skipNappyPrompt, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

async function feedAndFinish(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /start left/i }).click();
  await skipNappyPrompt(page);
  await page.getByRole('button', { name: /^R Right/ }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('dialog', { name: 'Is Olivia asleep?' }).getByRole('button', { name: 'Not now' }).click();
}

test('two feeds close together can be merged from the list', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  await feedAndFinish(page);
  backdateEvents(email, 12);
  await feedAndFinish(page);

  await page.goto('/track/breast_feed');
  await expect(page.getByText(/^1[12]m apart$/)).toBeVisible();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  const confirm = page.getByRole('alertdialog', { name: 'Merge feeds' });
  await confirm.getByRole('button', { name: 'Merge' }).click();
  await expect(page.getByText(/m apart$/)).toHaveCount(0);
  await expect(page.locator('a[href^="/events/"]')).toHaveCount(1);
});

test('a feed started soon after the last one can be merged into it while running', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  await feedAndFinish(page);
  backdateEvents(email, 8);

  await page.goto('/');
  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /start left/i }).click();
  await skipNappyPrompt(page);
  if (!/\/sessions\//.test(page.url())) await page.getByRole('link', { name: 'Open' }).first().click();
  const before = page.url();
  await expect(page.getByText(/^Started [78]m after the last feed$/)).toBeVisible();
  await page.getByRole('button', { name: 'Merge into it' }).click();
  await page.getByRole('alertdialog', { name: 'Merge feeds' }).getByRole('button', { name: 'Merge' }).click();
  await expect(page).not.toHaveURL(before);
  await expect(page).toHaveURL(/\/sessions\//);
  await expect(page.getByRole('button', { name: 'Merge into it' })).toHaveCount(0);
  await expect(page.getByText(/^Feeding/).first()).toBeVisible();

  await page.goto('/track/breast_feed');
  await expect(page.locator('a[href^="/events/"], a[href^="/sessions/"]')).toHaveCount(1);
});

async function napAndWake(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();
  await page.getByRole('button', { name: 'End nap' }).click();
  await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();
}

test('two sleeps close together can be merged, with the gap as a wake-up', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  await napAndWake(page);
  backdateEvents(email, 12);
  await napAndWake(page);

  await page.goto('/track/sleep');
  await expect(page.getByText(/^1[12]m apart$/)).toBeVisible();
  await page.getByRole('button', { name: 'Merge', exact: true }).click();
  await page.getByRole('alertdialog', { name: 'Merge sleeps' }).getByRole('button', { name: 'Merge' }).click();
  await expect(page.getByText(/m apart$/)).toHaveCount(0);
  await expect(page.locator('a[href^="/events/"]')).toHaveCount(1);
  await expect(page.getByText('1 wake-up').filter({ visible: true }).first()).toBeVisible();
});
