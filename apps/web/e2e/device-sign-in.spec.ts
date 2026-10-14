import { expect, test } from '@playwright/test';
import { joinPlus, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a signed-in phone signs chair mode in by scanning its code', async ({ page, browser }, testInfo) => {
  const email = uniqueEmail('scanner', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  joinPlus(email);

  const chairContext = await browser.newContext();
  const chair = await chairContext.newPage();
  await chair.goto('/chair?screenOff=30');
  await expect(chair).toHaveURL(/\/device-sign-in/);
  await expect(chair.getByRole('heading', { name: 'Sign in to chair mode' })).toBeVisible();
  await expect(chair.getByRole('img', { name: 'Sign-in QR code' })).toBeVisible();
  const code = (await chair.getByTestId('device-link-code').innerText()).trim();

  await page.goto('/link');
  await page.getByLabel('Code').fill(code.toLowerCase());
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in a device?' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await page.getByRole('button', { name: 'Sign in device' }).click();
  await expect(page.getByRole('heading', { name: 'Device signed in' })).toBeVisible();

  await expect(chair).toHaveURL(/\/chair\?screenOff=30$/, { timeout: 15_000 });
  await expect(chair.getByRole('button', { name: 'Start left' })).toBeVisible();

  await page.goto(`/link/${code.replace('-', '')}`);
  await expect(page.getByRole('heading', { name: 'Code not found' })).toBeVisible();
  await chairContext.close();
});
