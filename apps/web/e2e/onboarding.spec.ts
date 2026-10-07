import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { waitForMagicLink } from './mailpit';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a new parent signs in with a magic link and sets up their family', async ({ page }, testInfo) => {
  const email = `john+${Date.now()}-${testInfo.project.name}@example.com`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in/);
  await page.getByLabel('Email').fill(email);
  const requestedAt = new Date(Date.now() - 1000);
  await page.getByRole('button', { name: /email me a sign-in link/i }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  await page.goto(await waitForMagicLink(email, requestedAt));

  await expect(page.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await page.getByLabel('Your name').fill('John');
  await page.getByLabel('Family name').fill('The Smiths');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Add your baby' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Olivia');
  await page.getByLabel('Birth date').fill('2026-09-26');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: "When does Olivia's day start?" })).toBeVisible();
  await page.getByRole('radio', { name: /custom time/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Invite a caregiver' })).toBeVisible();
  await expect(page.getByText(/^[2-9A-HJ-NP-Z]{3}-[2-9A-HJ-NP-Z]{3}$/)).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Breastfeed')).toBeVisible();

  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await expect(page.getByText('John (you)')).toBeVisible();
});
