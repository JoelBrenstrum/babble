import { expect, test, type Page } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signIn, signUpWithPassword, skipNappyPrompt, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

async function newFamily(page: Page, project: string) {
  await signIn(page, uniqueEmail('john', project));
  await onboard(page);
}

async function tapStartFeed(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log breastfeed' }).click();
  await page.getByRole('button', { name: /start left/i }).click();
}

async function startFeed(page: Page) {
  await tapStartFeed(page);
  await skipNappyPrompt(page);
}

test('feeds and naps prompt each other', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);

  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await tapStartFeed(page);
  const endNap = page.getByRole('dialog', { name: "End Olivia's nap?" });
  await expect(endNap).toBeVisible();
  await endNap.getByRole('button', { name: 'End nap now' }).click();
  await expect(endNap).toHaveCount(0);
  await skipNappyPrompt(page);
  await expect(page.getByText('Feeding · Left')).toBeVisible();

  await page.getByRole('button', { name: 'Finish' }).click();
  const asleep = page.getByRole('dialog', { name: 'Is Olivia asleep?' });
  await expect(asleep).toBeVisible();
  await asleep.getByRole('button', { name: 'Start nap now' }).click();
  await expect(asleep).toHaveCount(0);

  await page.goto('/');
  await expect(page.getByText('Napping')).toBeVisible();
});

test('starting a feed offers to log a nappy, then returns to the feed', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await tapStartFeed(page);
  const prompt = page.getByRole('dialog', { name: "Change Olivia's nappy?" });
  await prompt.getByRole('button', { name: 'Yes, log a nappy' }).click();
  await expect(page.getByRole('heading', { name: 'Log nappy' })).toBeVisible();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL(/\/sessions\//);
  await expect(page.getByText('Feeding · Left')).toBeVisible();

  await page.goto('/');
  await expect(
    page
      .getByRole('link', { name: /^Nappy/ })
      .filter({ visible: true })
      .first(),
  ).toContainText('Wet');
});

test('starting a nap offers to end a running feed', async ({ page }, testInfo) => {
  await newFamily(page, testInfo.project.name);
  await startFeed(page);
  await expect(page.getByText('Feeding · Left')).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  const endFeed = page.getByRole('dialog', { name: "End Olivia's feed?" });
  await expect(endFeed).toBeVisible();
  await endFeed.getByRole('button', { name: 'End feed' }).click();
  await expect(endFeed).toHaveCount(0);

  await page.goto('/');
  await expect(page.getByText('Napping')).toBeVisible();
  await expect(page.getByText(/^Feeding/)).toHaveCount(0);
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

test('idle time from a forgotten switch can be taken off', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await startFeed(page);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.waitForTimeout(20_000);
  await page.getByRole('button', { name: /^R Right/ }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();

  if (!/\/sessions\//.test(page.url())) await page.getByRole('link', { name: 'Open' }).first().click();
  await expect(page.getByText('Downtime')).toBeVisible();
  await page.getByRole('button', { name: 'Take a minute off the idle time' }).click();
  await expect(page.getByText('Downtime')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Downtime')).toHaveCount(0);
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
