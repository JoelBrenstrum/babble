import { expect, type Page } from '@playwright/test';
import { waitForMagicLink } from './mailpit';

export async function signIn(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: /email me a sign-in link$/i }).click();
  await page.getByLabel('Email').fill(email);
  const requestedAt = new Date(Date.now() - 1000);
  await page.getByRole('button', { name: /email me a sign-in link/i }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.goto(await waitForMagicLink(email, requestedAt));
}

export async function onboard(page: Page) {
  await expect(page.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await page.getByLabel('Your name').fill('John');
  await page.getByLabel('Family name').fill('The Smiths');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Add your baby' })).toBeVisible();
  await page.getByLabel('Name', { exact: true }).fill('Olivia');
  await page.getByLabel('Birth date').fill('2026-09-26');
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: "When does Olivia's day start?" })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByRole('heading', { name: 'Invite a caregiver' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Breastfeed')).toBeVisible();
}

export async function skipNappyPrompt(page: Page) {
  const prompt = page.getByRole('dialog', { name: "Change Olivia's nappy?" });
  await prompt.getByRole('button', { name: 'Not now' }).click();
  await expect(prompt).toHaveCount(0);
}

export function uniqueEmail(name: string, project: string) {
  return `${name}+${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${project}@example.com`;
}

export async function signUpWithPassword(page: Page, email: string) {
  await page.goto('/sign-in');
  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery');
  await page.getByRole('button', { name: 'Create account' }).click();
}
