import { expect, test } from '@playwright/test';
import { backdateEvents, joinPlus, setFeedReminder, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('the timeline shows the day and the last 7 days and opens entries', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  for (const kind of ['Both', 'Wet', 'Dirty']) {
    await page.goto('/');
    await page.getByRole('link', { name: 'Log nappy' }).click();
    await page.getByRole('radio', { name: kind }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).not.toHaveURL(/\/new/);
  }
  await page.goto('/');
  await page.getByRole('link', { name: 'Log sleep' }).click();
  await page.getByRole('button', { name: /start sleep now/i }).click();
  await expect(page.getByText('Napping')).toBeVisible();

  await page.getByRole('link', { name: 'Timeline' }).filter({ visible: true }).click();
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home, nap running' }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /^Sleep .*running$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Next day' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('img', { name: /^Night ends \d/ })).toBeVisible();
  await expect(page.getByRole('img', { name: /^Night starts \d/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('night.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('link', { name: /^Nappy .*both$/ }).click();
  await expect(page.getByRole('heading', { name: 'Nappy' })).toBeVisible();
  await page.goBack();

  await page.getByRole('radio', { name: '7d' }).click();
  await expect(page.getByRole('link', { name: /^Open / })).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'Next 7 days' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText('Feeds/day')).toBeVisible();
  await expect(page.getByRole('cell').filter({ hasText: /^3$/ }).first()).toBeVisible();
  await page.getByRole('link', { name: 'Previous 7 days' }).click();
  await expect(page.getByRole('link', { name: 'Next 7 days' })).not.toHaveAttribute('aria-disabled', 'true');
  await page
    .getByRole('link', { name: /^Open / })
    .first()
    .click();
  await expect(page.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true');
});

test('the timeline shows the last 24 hours with totals for that window', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await page.goto('/timeline');
  await page.getByRole('radio', { name: '24h' }).click();
  await expect(page).toHaveURL(/view=24h/);
  await expect(page.getByText('Last 24 hours')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Previous day' })).toHaveCount(0);
  await expect(page.getByTestId('day-timeline')).toBeVisible();
  await expect(page.getByText('Wet').first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('timeline-24h.png'), fullPage: true });
});

test('Plus compares a day, and the last 24 hours, with the one before', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  await page.getByRole('link', { name: 'Log nappy' }).click();
  await page.getByRole('radio', { name: 'Wet' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).not.toHaveURL(/\/new/);

  await page.goto('/timeline');
  await page.getByRole('button', { name: 'Compare with yesterday' }).click();
  await expect(page.getByRole('heading', { name: 'Babble Plus' })).toBeVisible();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page).not.toHaveURL(/compare=true/);

  joinPlus(email);
  await page.reload();
  await page.getByRole('button', { name: 'Compare with yesterday' }).click();
  await expect(page).toHaveURL(/compare=true/);
  await expect(page.getByRole('button', { name: 'Stop comparing' })).toHaveAttribute('aria-pressed', 'true');
  const card = page.locator('[aria-labelledby=timeline-comparison]');
  await expect(card.getByRole('heading', { name: 'By this time yesterday' })).toBeVisible();
  await expect(card.getByRole('row', { name: /^Nappies 0 1 \+1$/ })).toBeVisible();
  const columns = page.getByTestId('day-comparison-timelines');
  await expect(columns.getByTestId('day-timeline')).toHaveCount(2);
  await expect(columns.locator(':scope > div > span').first()).toHaveText('Yesterday');
  await expect(card.getByRole('columnheader')).toHaveText(['Measure', 'Yesterday', 'Today', 'Change']);
  await expect(page.getByText('Idle', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.getByRole('link', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(/compare=true/);
  await expect(card.getByRole('heading', { name: /^Compared with / })).toBeVisible();
  await expect(card.getByRole('row', { name: /^Nappies 0 0 Same$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(page).not.toHaveURL(/compare=true/);
  await expect(card).toHaveCount(0);
  await expect(page.getByText('Idle', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Compare with / })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('radio', { name: '24h' }).click();
  await page.getByRole('button', { name: 'Compare with the 24 hours before' }).click();
  await expect(page).toHaveURL(/view=24h.*compare=true|compare=true.*view=24h/);
  await expect(card.getByRole('heading', { name: 'Compared with the 24 hours before' })).toBeVisible();
  await expect(card.getByRole('columnheader')).toHaveText(['Measure', 'The 24h before', 'Last 24h', 'Change']);
  await expect(card.getByRole('row', { name: /^Nappies 0 1 \+1$/ })).toBeVisible();
  await expect(columns.getByTestId('day-timeline')).toHaveCount(2);
  await expect(columns.locator(':scope > div > span').first()).toHaveText('The 24h before');
  await expect(page.getByText('Idle', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop comparing' }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByText('Idle', { exact: true })).toBeVisible();
});

test('Plus marks when the next feed is due on the timeline', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  await page.getByRole('link', { name: 'Log bottle' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).not.toHaveURL(/\/new/);
  setFeedReminder(email, 2);

  await page.goto('/timeline');
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
  await expect(page.getByTestId('feed-due-line')).toHaveCount(0);

  joinPlus(email);
  await page.reload();
  await expect(page.getByRole('img', { name: /^Feed due \d/ })).toBeVisible();

  backdateEvents(email, 10);
  await page.reload();
  await expect(page.getByRole('img', { name: /^Feed was due \d/ })).toBeVisible();
  await page.getByRole('radio', { name: '24h' }).click();
  await expect(page.getByRole('img', { name: /^Feed was due \d/ })).toBeVisible();
});
