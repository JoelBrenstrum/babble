import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('chair mode asks for a nappy when a feed starts and offers a nap when it ends', async ({ page }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);

  await page.goto('/settings');
  await page.getByRole('link', { name: /Open chair mode/ }).click();
  await expect(page).toHaveURL(/\/chair$/);
  await expect(page.getByText('No feeds logged yet')).toBeVisible();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('idle.png') });

  await page.getByRole('button', { name: 'Dim now' }).click();
  await expect(page.getByText('Dimmed · tap to wake')).toBeVisible();
  await expect(page.getByTestId('chair')).toHaveClass(/chair-dim/);
  await page.screenshot({ path: testInfo.outputPath('dimmed.png') });
  await page.getByRole('button', { name: 'Start left' }).click();
  await expect(page.getByText('Dimmed · tap to wake')).toHaveCount(0);
  await expect(page.getByText('No feeds logged yet')).toBeVisible();

  await page.getByRole('button', { name: 'Start left' }).click();
  await expect(page.getByText('Feeding · Left')).toBeVisible();
  const nappyAsk = page.getByRole('dialog', { name: "Change Olivia's nappy?" });
  await nappyAsk.getByRole('button', { name: 'Yes, log a nappy' }).click();
  await page.getByRole('dialog', { name: 'Nappy' }).getByRole('button', { name: 'Wet', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Nappy saved · Wet');
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Right' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused · Right')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('paused.png') });
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();

  await page.getByRole('button', { name: 'End feed' }).click();
  await expect(page.getByText(/^Fed /)).toBeVisible();
  await page.getByRole('button', { name: "Olivia's asleep" }).click();
  await expect(page.getByRole('status')).toContainText('Nap started');
  await expect(page.getByRole('button', { name: /^End nap/ })).toBeVisible();
  await page.getByRole('button', { name: /^End nap/ }).click();
  await expect(page.getByRole('status')).toContainText('Nap ended');

  await expect(page.getByText(/^Last fed .+ · just now · Right side/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start left' })).toContainText('Next');
  await expect(page.getByRole('button', { name: /^Nappy/ })).toContainText('Wet · just now');
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 7_000 });
  await page.screenshot({ path: testInfo.outputPath('idle-after.png') });

  await page.getByRole('button', { name: 'Bottle' }).click();
  await page.getByRole('button', { name: 'More, 10 ml' }).click();
  await page.getByRole('radio', { name: 'Formula' }).click();
  await page.screenshot({ path: testInfo.outputPath('bottle.png') });
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Bottle saved · 130 ml');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/^Last fed .+ · just now · Right side/)).toBeVisible();

  await page.getByRole('button', { name: 'Start right' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('feeding.png') });
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('status')).toContainText('Feed discarded');
  await expect(page.getByRole('button', { name: 'Start right' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('button', { name: 'Start right' })).toBeVisible();

  await page.goto('/track/nappy');
  await expect(page.getByText('Wet').first()).toBeVisible();
});
