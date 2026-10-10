import { expect, test, type Page } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, signUpWithPassword, skipNappyPrompt, uniqueEmail } from './helpers';

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
  await skipNappyPrompt(page);

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
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByText('Next side')).toBeVisible();
  await expect(page.getByText('Left', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Breastfeed/ }).filter({ visible: true })).toHaveCount(1);

  await page.goto('/track/breast_feed/new');
  await expect(page.getByRole('button', { name: /start left/i })).toContainText('Next');
  await expect(page.getByRole('button', { name: /start right/i })).not.toContainText('Next');
});

test('a nappy can be logged, edited, deleted and restored', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log nappy' }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  await page.getByRole('radio', { name: 'Both' }).click();
  await page.getByRole('checkbox', { name: 'Mustard' }).click();
  await page.getByRole('checkbox', { name: 'Green', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Brown' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Both', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: /Both/ }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Both', { exact: true })).toHaveCount(0);
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
  await page.getByRole('radio', { name: 'Wet' }).click();
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

test('each list shows a summary strip that opens stats', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Both' }).click();
  await page.getByRole('checkbox', { name: 'Mustard' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/track/nappy');
  await expect(page.getByText('Last change')).toBeVisible();
  await expect(page.getByText('Just now')).toBeVisible();
  await expect(page.getByText('Wet today')).toBeVisible();
  await expect(page.getByText('Dirty today')).toBeVisible();

  await page.getByRole('link', { name: 'Open stats' }).click();
  await expect(page).toHaveURL(/\/stats/);
});

test('sleep details saved during a nap show up on another device', async ({ page, browser }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();
  const sessionUrl = page.url();

  const other = await browser.newContext({
    storageState: await page.context().storageState(),
    viewport: page.viewportSize() ?? undefined,
  });
  const otherPage = await other.newPage();
  await otherPage.goto(sessionUrl);
  await expect(otherPage.getByRole('checkbox', { name: 'Cot' })).toHaveAttribute('aria-checked', 'false');

  await page.getByRole('checkbox', { name: 'Cot' }).click();
  await page.getByLabel('Notes (optional)').fill('Went down easily');
  await page.getByLabel('Notes (optional)').blur();

  await expect(otherPage.getByRole('checkbox', { name: 'Cot' })).toHaveAttribute('aria-checked', 'true', {
    timeout: 10_000,
  });
  await expect(otherPage.getByLabel('Notes (optional)')).toHaveValue('Went down easily', { timeout: 10_000 });
  await expect(page.getByText('Napping')).toBeVisible();
  await other.close();
});

test('a nap can be ended earlier, and the entry shows who ended it', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await page.getByRole('button', { name: 'Ended earlier?' }).click();
  await expect(page.getByRole('button', { name: '5 min ago', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: /change start time/i }).click();
  await page.getByRole('button', { name: '15 min earlier' }).click();

  await page.getByRole('button', { name: 'Ended earlier?' }).click();
  await page.getByRole('button', { name: '5 min ago', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();
  await expect(page.getByText(/Started by John · /)).toBeVisible();
  await expect(page.getByText(/^Ended by John at /)).toBeVisible();
});

test('a nap can be paused and resumed, and shows its wake-ups', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await page.getByRole('button', { name: 'Pause nap' }).click();
  await expect(page.getByText('Awake · nap paused')).toBeVisible();
  await expect(page.getByText(/1 wake-up/)).toBeVisible();
  await page.getByRole('button', { name: 'Resume nap' }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await page.getByRole('button', { name: 'End nap' }).click();
  await expect(page.getByRole('heading', { name: 'Sleep' })).toBeVisible();
  await page.goto('/track/sleep');
  await expect(page.getByText('1 wake-up').filter({ visible: true }).first()).toBeVisible();
});

test('awake time on a live nap can be taken off a minute at a time', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();
  await page.getByRole('button', { name: 'Pause nap' }).click();
  await expect(page.getByText('Awake · nap paused')).toBeVisible();
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Resume nap' }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  if (!/\/sessions\//.test(page.url())) await page.getByRole('link', { name: 'Open' }).first().click();
  await expect(page.getByText('Awake', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Take a minute off wake-up 1' }).click();
  await expect(page.getByText('Awake', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Asleep', { exact: true })).toBeVisible();
  await expect(page.getByText('Awake', { exact: true })).toHaveCount(0);
});
