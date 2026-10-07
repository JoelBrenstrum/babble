import { expect, test, type Page } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

async function newFamily(page: Page, project: string) {
  await signIn(page, uniqueEmail('john', project));
  await onboard(page);
}

function trackerRow(page: Page, name: string) {
  return page
    .getByRole('link', { name: new RegExp(`^${name}`) })
    .filter({ visible: true })
    .first();
}

test('a breastfeed timer switches sides, pauses, resumes and finishes', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /start left/i }).click();

  await expect(page.getByText('Feeding · Left')).toBeVisible();
  await page.getByRole('button', { name: /^R Right/ }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Feeding · paused')).toBeVisible();
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('heading', { name: 'Breastfeed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeVisible();

  await page.goto('/track/breast_feed');
  await expect(page.getByText('Today')).toBeVisible();
  await expect(page.getByRole('link', { name: /Breastfeed/ }).filter({ visible: true })).toHaveCount(1);
});

test('a nappy can be logged, edited, deleted and restored', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Both' }).click();
  await page.getByRole('checkbox', { name: 'Mustard' }).click();
  await page.getByRole('checkbox', { name: 'Green', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Brown' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Dirty', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Wet/ }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Dirty', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Wet', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: /Wet/ }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Entry deleted')).toBeVisible();
  await page.goto('/track/nappy');
  await expect(page.getByText('No nappies yet')).toBeVisible();

  await page.goto('/');
  await expect(trackerRow(page, 'Nappy')).toContainText('Nothing logged yet');
});

test('undo restores a deleted entry', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('link', { name: /Wet/ }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('link', { name: /Wet/ })).toBeVisible();
});

test('a nap started on one device appears on another', async ({ page, browser }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  const other = await browser.newContext({
    storageState: await page.context().storageState(),
    viewport: page.viewportSize() ?? undefined,
  });
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await expect(otherPage.getByText('Breastfeed')).toBeVisible();

  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await expect(otherPage.getByText('Napping')).toBeVisible({ timeout: 10_000 });
  await otherPage.getByRole('button', { name: 'End nap' }).click();
  await expect(otherPage.getByText('Napping')).toHaveCount(0);
  await expect(page.getByText('Napping')).toHaveCount(0, { timeout: 10_000 });
  await other.close();
});
