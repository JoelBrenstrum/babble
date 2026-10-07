import { expect, test } from '@playwright/test';

test('dev accounts sign in with one tap and land in the seeded family', async ({ page }) => {
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as Jane' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Settings' }).filter({ visible: true }).click();
  await expect(page.getByText('Jane (you)')).toBeVisible();
  await expect(page.getByText('John', { exact: true })).toBeVisible();
});
