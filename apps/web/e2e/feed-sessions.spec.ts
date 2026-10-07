import { expect, test, type Page } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

async function newFamily(page: Page, project: string) {
  await signIn(page, uniqueEmail('john', project));
  await onboard(page);
}

async function startFeed(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /start left/i }).click();
}

test('feeds and naps prompt each other', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await startFeed(page);
  const endNap = page.getByRole('dialog', { name: "End Olivia's nap?" });
  await expect(endNap).toBeVisible();
  await endNap.getByRole('button', { name: 'End nap now' }).click();
  await expect(endNap).toHaveCount(0);
  await expect(page.getByText('Feeding · Left')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  const asleep = page.getByRole('dialog', { name: 'Is Olivia asleep?' });
  await expect(asleep).toBeVisible();
  await asleep.getByRole('button', { name: 'Start nap now' }).click();
  await expect(asleep).toHaveCount(0);

  await page.goto('/');
  await expect(page.getByText('Napping')).toBeVisible();
});

test('the latest feed can be resumed', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await startFeed(page);
  await page.getByRole('button', { name: /^R Right/ }).click();
  await page.getByRole('button', { name: 'Finish' }).click();
  await page.getByRole('dialog', { name: 'Is Olivia asleep?' }).getByRole('button', { name: 'Not now' }).click();

  await page.getByRole('button', { name: 'Resume feed' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await expect(page.getByText('Total feeding')).toBeVisible();
});

test('a running feed can be backdated', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await startFeed(page);
  await expect(page.getByText('Feeding · Left')).toBeVisible();

  await page.getByRole('button', { name: /change start time/i }).click();
  await page.getByRole('button', { name: '10 min earlier' }).click();
  await expect(page.getByText(/total 10m/)).toBeVisible();

  await page.reload();
  await expect(page.getByText(/total 10m/)).toBeVisible();

  await page.getByRole('button', { name: /change start time/i }).click();
  const editor = page.getByRole('group', { name: 'Change start time' });
  await editor.getByLabel('Start time').fill('2099-01-01T09:00');
  await expect(editor.getByText("The start can't be in the future.")).toBeVisible();
  await expect(editor.getByRole('button', { name: 'Save start' })).toBeDisabled();
});

test('a feed can be edited segment by segment', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /log a past feed/i }).click();
  await page.getByLabel('Left', { exact: true }).fill('10');
  await page.getByLabel('Right', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Save' }).click();

  await page
    .getByRole('link', { name: /Breastfeed/ })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByText('Total feeding')).toBeVisible();
  const first = page.getByLabel('Segment 1 minutes');
  await first.fill('8');
  await page.getByRole('button', { name: 'Add downtime' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page.getByText('L 8m')).toBeVisible();
  await expect(page.getByText('R 12m')).toBeVisible();
});

test('timers stay accurate when the device clock is wrong', async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date(Date.now() - 2 * 60_000) });
  await page.clock.resume();
  await newFamily(page, testInfo.project.name);
  await startFeed(page);
  await expect(page.getByText('Feeding · Left')).toBeVisible();
  await page.waitForTimeout(3000);
  const timer = page.locator('.tabular.text-timer-lg').first();
  await expect(timer).toHaveText(/^0:0[1-9]$/);
});
