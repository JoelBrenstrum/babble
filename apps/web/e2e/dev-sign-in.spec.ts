import { expect, test } from '@playwright/test';

test('dev accounts sign in with one tap and land in the seeded family', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as Jane' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await expect(page.getByText('Jane (you)')).toBeVisible();
  await expect(page.getByText('John', { exact: true })).toBeVisible();
});

test('switching babies keeps their entries separate', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as John' }).click();
  const switcher = page.getByRole('button', { name: /switch baby/i }).filter({ visible: true });

  await switcher.click();
  await page.getByRole('option', { name: /Jacob/ }).click();
  await expect(switcher).toContainText('Jacob');

  const note = `e2e ${Date.now()}`;
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByLabel('Notes (optional)').fill(note);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(note)).toBeVisible();

  await page.goto('/');
  await expect(switcher).toContainText('Jacob');
  await switcher.click();
  await page.getByRole('option', { name: /Olivia/ }).click();
  await expect(switcher).toContainText('Olivia');
  await page.goto('/track/nappy');
  await expect(page.getByRole('heading', { name: 'Nappies', exact: true })).toBeVisible();
  await expect(page.getByText(note)).toHaveCount(0);
});
