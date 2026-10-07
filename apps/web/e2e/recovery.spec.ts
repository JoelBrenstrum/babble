import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, uniqueEmail } from './helpers';

const SUPABASE = 'http://127.0.0.1:54321';
// The standard service-role key of every local Supabase CLI instance.
const SERVICE_ROLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

async function recoveryLink(email: string): Promise<string> {
  const response = await fetch(`${SUPABASE}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'recovery', email, redirect_to: 'http://localhost:3210/auth/callback' }),
  });
  const body = (await response.json()) as { action_link: string };
  return body.action_link;
}

test('a dashboard recovery link lets a parent choose a new password', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await page.goto('/sign-in');
  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('first password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await onboard(page);
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());

  await page.goto(await recoveryLink(email));
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByLabel('New password').fill('second password');
  await page.getByLabel('Confirm password').fill('second password');
  await page.getByRole('button', { name: 'Save password' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();

  await page.evaluate(() => localStorage.clear());
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('second password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
});
