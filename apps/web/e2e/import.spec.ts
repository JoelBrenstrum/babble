import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = fileURLToPath(
  new URL('../../../packages/domain/src/huckleberry/__fixtures__/real-week.csv', import.meta.url),
);

test('a Huckleberry export imports once and re-imports without duplicates', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Imports into shared seed data; run once.');
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as John' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();

  await page.goto('/import');
  await page.getByLabel('Huckleberry CSV file').setInputFiles(fixture);
  await page.getByLabel('Import into').selectOption({ label: 'Jacob' });
  await expect(page.getByText('134 entries ready to import')).toBeVisible();
  await page.getByRole('button', { name: /Import 134 entries into Jacob/ }).click();
  await expect(page.getByText(/entries? imported/)).toBeVisible({ timeout: 30_000 });

  await page.goto('/import');
  await page.getByLabel('Huckleberry CSV file').setInputFiles(fixture);
  await page.getByLabel('Import into').selectOption({ label: 'Jacob' });
  await page.getByRole('button', { name: /Import 134 entries into Jacob/ }).click();
  await expect(page.getByText('0 entries imported')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('134 were already in Babble and left as they were.')).toBeVisible();
});
