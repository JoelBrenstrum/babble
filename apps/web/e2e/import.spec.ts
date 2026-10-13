import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
  await page.getByLabel('File to import').setInputFiles(fixture);
  await page.getByLabel('Import into').selectOption({ label: 'Jacob' });
  await expect(page.getByText('134 entries ready to import')).toBeVisible();
  await page.getByRole('button', { name: /Import 134 entries into Jacob/ }).click();
  await expect(page.getByText(/entries? imported/)).toBeVisible({ timeout: 30_000 });

  await page.goto('/import');
  await page.getByLabel('File to import').setInputFiles(fixture);
  await page.getByLabel('Import into').selectOption({ label: 'Jacob' });
  await page.getByRole('button', { name: /Import 134 entries into Jacob/ }).click();
  await expect(page.getByText('0 entries imported')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('134 were already in babble and left as they were.')).toBeVisible();
});

test('a babble export restored into the baby it came from skips the entries already there', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Imports into shared seed data; run once.');
  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Sign in as John' }).click();
  await expect(page.getByText('Olivia').filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Wet', { exact: true }).first()).toBeVisible();

  await page.goto('/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Olivia' }).click();
  const file = (await (await download).path())!;

  await page.goto('/import');
  await page
    .getByLabel('File to import')
    .setInputFiles({ name: 'olivia.json', mimeType: 'application/json', buffer: await readFile(file) });
  await expect(page.getByLabel('Timezone of these records')).toHaveCount(0);
  const ready = page.getByText(/\d+ entr(y|ies) ready to import/);
  await expect(ready).toBeVisible();
  const count = Number((await ready.textContent())!.match(/\d+/)![0]);

  await page.getByLabel('Import into').selectOption({ label: 'Olivia' });
  await page.getByRole('button', { name: new RegExp(`Import ${count} entr(y|ies) into Olivia`) }).click();
  await expect(page.getByText('0 entries imported')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(new RegExp(`^${count} (was|were) already in babble`))).toBeVisible();
});
