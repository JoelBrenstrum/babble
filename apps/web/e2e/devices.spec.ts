import { expect, test } from '@playwright/test';
import { joinPlus, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('an admin names another member’s device and their entries use it', async ({ page, browser }, testInfo) => {
  const johnEmail = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, johnEmail);
  await onboard(page);
  joinPlus(johnEmail);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Invite someone' }).click();
  await page.getByRole('button', { name: 'Create invite' }).click();
  const code = (await page.locator('.tabular.tracking-widest').innerText()).trim();

  const granContext = await browser.newContext();
  const gran = await granContext.newPage();
  await signUpWithPassword(gran, uniqueEmail('gran', testInfo.project.name));
  await expect(gran.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await gran.goto(`/join/${code}`);
  await gran.getByLabel('Your name').fill('Gran');
  await gran.getByRole('button', { name: 'Join family' }).click();
  await expect(gran.getByRole('link', { name: 'Log nappy' })).toBeVisible();

  await page.reload();
  const devices = page.getByRole('list', { name: 'Devices' });
  await expect(page.getByText('Signed-in devices')).toBeVisible();
  await expect(devices.getByText('John · This device')).toBeVisible();
  await devices.getByRole('button', { name: /^Rename .*\(Gran\)$/ }).click();
  await devices.getByLabel('Device name').fill('Gran’s tablet');
  await devices.getByRole('button', { name: 'Save' }).click();
  await expect(devices.getByText('Gran’s tablet')).toBeVisible();

  await gran.goto('/settings');
  await expect(gran.getByText('Your devices')).toBeVisible();
  await expect(gran.getByLabel('Device name')).toHaveValue('Gran’s tablet');

  await gran.goto('/track/nappy/new');
  await gran.getByRole('radio', { name: 'Wet' }).click();
  await gran.getByRole('button', { name: 'Save' }).click();
  await gran.goto('/track/nappy');
  await gran.getByRole('link', { name: /Wet/ }).first().click();
  await expect(gran.getByText(/Logged by Gran on Gran’s tablet/)).toBeVisible();

  await page.reload();
  await devices.getByRole('button', { name: 'Sign out Gran’s tablet (Gran)' }).click();
  await expect(devices.getByText('Sign out Gran’s tablet (Gran)? It stops working within the hour.')).toBeVisible();
  await devices.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(devices.getByText('Gran’s tablet')).toHaveCount(0);
  await expect(devices.getByText('John · This device')).toBeVisible();
  await granContext.close();
});
