import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a parent creates an account with a password and signs back in', async ({ page }, testInfo) => {
  const email = uniqueEmail('jane', testInfo.project.name);
  await page.goto('/sign-in');
  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
  await onboard(page);

  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('wrong password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText("don't match");

  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
});
