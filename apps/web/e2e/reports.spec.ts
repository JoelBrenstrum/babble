import { expect, test } from '@playwright/test';
import { seedReportEvents, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('a family builds, saves, views and hits the free limit for reports', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  seedReportEvents(email);

  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  await expect(page.getByText('No reports yet')).toBeVisible();
  await expect(page.getByText('0 of 2 saved · shared with everyone in the family')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reports-empty.png'), fullPage: true });

  await page.getByRole('link', { name: 'Feeds per day' }).click();
  await expect(page).toHaveURL(/\/reports\/new\?template=feeds-per-day/);
  await expect(page.getByRole('heading', { name: 'Breastfeeds and Bottles, 30 days' })).toBeVisible();
  await expect(page.locator('[aria-busy=true]')).toHaveCount(0);
  const bars = page.getByRole('img', { name: /Bottles 4/ });
  await expect(bars.first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('builder-template.png'), fullPage: true });

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const save = page.getByRole('dialog', { name: 'Save report' });
  await expect(save.getByLabel('Name')).toHaveValue('Breastfeeds and Bottles, 30 days');
  await save.getByLabel('Name').fill('Feeds per day');
  await save.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Feeds per day' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('report-view.png'), fullPage: true });

  await page.getByRole('button', { name: 'Report actions' }).click();
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByRole('checkbox', { name: 'Bottles' }).filter({ visible: true }).click();
  await page.getByRole('checkbox', { name: 'Breastfeeds' }).filter({ visible: true }).click();
  await page.getByRole('checkbox', { name: 'Feeds', exact: true }).filter({ visible: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('radio', { name: 'Range' }).click();
  await page.getByRole('checkbox', { name: 'Hour of day' }).filter({ visible: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('radio', { name: 'Chart' }).click();
  const heatmap = page.getByRole('radio', { name: /Heatmap/ }).filter({ visible: true });
  await expect(heatmap).toContainText('Suggested');
  await heatmap.click();
  await expect(heatmap).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('img', { name: 'Feeds by hour of day, one row per day' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('builder-heatmap.png'), fullPage: true });
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('dialog', { name: 'Save report' }).getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('img', { name: 'Feeds by hour of day, one row per day' })).toBeVisible();

  await page.goto('/reports/new');
  await page.getByRole('checkbox', { name: 'Time asleep' }).filter({ visible: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('radio', { name: 'Split' }).click();
  await page.getByRole('checkbox', { name: 'Location' }).filter({ visible: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('radio', { name: 'Chart' }).click();
  await page.getByRole('radio', { name: /Donut/ }).filter({ visible: true }).click();
  await expect(page.getByRole('list').getByText('Cot')).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('dialog', { name: 'Save report' }).getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);

  await page.goto('/reports');
  await expect(page.getByText('2 of 2 saved · shared with everyone in the family')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Feeds per day 30 days/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('reports-list.png'), fullPage: true });

  await page.getByRole('link', { name: 'Nappy output' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const limit = page.getByRole('dialog', { name: 'Save report' });
  await expect(limit.getByText("You've saved 2 reports")).toBeVisible();
  await expect(limit.getByRole('button', { name: 'Replace' })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('save-limit.png') });
  await limit.getByRole('radio', { name: /Time asleep by location/ }).click();
  await limit.getByRole('button', { name: 'Replace' }).click();
  await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{36}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Nappies by nappy, 14 days' })).toBeVisible();

  await page.getByRole('button', { name: 'Report actions' }).click();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).last().click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByText('1 of 2 saved · shared with everyone in the family')).toBeVisible();
});
