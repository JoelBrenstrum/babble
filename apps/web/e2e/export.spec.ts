import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a parent can export everything as JSON, including deleted entries', async ({ page }, testInfo) => {
  await signIn(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.goto('/');
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: /Wet/ }).first().click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Entry deleted')).toBeVisible();

  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Olivia' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^babble-olivia-\d{4}-\d{2}-\d{2}\.json$/);

  const data = JSON.parse(await readFile((await file.path())!, 'utf8'));
  expect(data).toMatchObject({ format: 'babble-export', version: 1 });
  expect(data.babies).toHaveLength(1);
  expect(data.babies[0].baby.name).toBe('Olivia');
  const nappies = data.babies[0].events.filter((event: { type: string }) => event.type === 'nappy');
  expect(nappies).toHaveLength(2);
  expect(nappies.filter((event: { deletedAt: string | null }) => event.deletedAt !== null)).toHaveLength(1);
});
