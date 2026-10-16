import { expect, test } from '@playwright/test';
import { joinPlus, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('an admin invites someone read only, then lets them log', async ({ page, browser }, testInfo) => {
  const johnEmail = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, johnEmail);
  await onboard(page);
  joinPlus(johnEmail);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Invite someone' }).click();
  await page.getByRole('radio', { name: 'Read only' }).click();
  await page.getByRole('button', { name: 'Create invite' }).click();
  await expect(page.getByText('Joins as Read only')).toBeVisible();
  const code = (await page.locator('.tabular.tracking-widest').innerText()).trim();

  const granContext = await browser.newContext();
  const gran = await granContext.newPage();
  await signUpWithPassword(gran, uniqueEmail('gran', testInfo.project.name));
  await expect(gran.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await gran.goto(`/join/${code}`);
  await gran.getByLabel('Your name').fill('Gran');
  await gran.getByRole('button', { name: 'Join family' }).click();
  await expect(gran.getByText('Breastfeed')).toBeVisible();
  await expect(gran.getByRole('link', { name: 'Log nappy' })).toHaveCount(0);

  await gran.goto('/track/nappy/new');
  await expect(gran).toHaveURL(/\/track\/nappy$/);
  await expect(gran.getByRole('link', { name: 'Add nappy' })).toHaveCount(0);

  await gran.goto('/settings');
  await expect(
    gran.getByText('You have read-only access. Ask an admin to change these settings.').first(),
  ).toBeVisible();
  await expect(gran.getByRole('button', { name: 'Invite someone' })).toHaveCount(0);
  await expect(gran.getByRole('link', { name: /Import data/ })).toHaveCount(0);

  await page.reload();
  const members = page.getByRole('list', { name: 'Family members' });
  await expect(members.getByText('Read only', { exact: true })).toBeVisible();
  await members.getByRole('button', { name: "Change Gran's role" }).click();
  await members.getByRole('radio', { name: 'Caregiver' }).click();
  await members.getByRole('button', { name: 'Save' }).click();
  await expect(members.getByRole('radio')).toHaveCount(0);
  await expect(members.getByText('Caregiver', { exact: true })).toBeVisible();

  await gran.goto('/');
  await gran.getByRole('link', { name: 'Log nappy' }).click();
  await gran.getByRole('radio', { name: 'Wet' }).click();
  await gran.getByRole('button', { name: 'Save' }).click();
  await expect(gran.getByText('Wet', { exact: true }).first()).toBeVisible();

  await gran.goto('/settings');
  await expect(gran.getByText(/Only admins can change these settings/).first()).toBeVisible();
  await expect(gran.getByRole('button', { name: 'Invite someone' })).toHaveCount(0);
  await granContext.close();
});
