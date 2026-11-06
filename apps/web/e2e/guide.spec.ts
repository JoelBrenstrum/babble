import { expect, test } from '@playwright/test';

test('guide and welcome pages render', async ({ page }, testInfo) => {
  await page.goto('/guide');
  await expect(page.getByRole('heading', { level: 1, name: 'Reports and the dashboard' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('guide.png'), fullPage: true });
  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 3, name: 'Reports' })).toBeVisible();
  await page.getByRole('link', { name: 'How reports work' }).click();
  await expect(page).toHaveURL(/\/guide#reports$/);
  await expect(page.getByRole('heading', { name: 'Reports', level: 2 })).toBeVisible();
});
