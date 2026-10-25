import { expect, test } from '@playwright/test';
import { joinPlus, setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('chair mode asks for a nappy when a feed starts and offers a nap when it ends', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  joinPlus(email);

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
  await expect(page.getByText('Feeding · Left')).toBeVisible();
  const nappyAsk = page.getByRole('dialog', { name: "Change Olivia's nappy?" });
  await nappyAsk.getByRole('button', { name: 'Yes, log a nappy' }).click();
  await page.getByRole('dialog', { name: 'Nappy' }).getByRole('button', { name: 'Wet', exact: true }).click();
  const nappySizes = page.getByRole('dialog', { name: 'Nappy · Wet' });
  await nappySizes.getByRole('radio', { name: 'Heavy' }).click();
  await page.screenshot({ path: testInfo.outputPath('nappy-sizes.png') });
  await nappySizes.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Nappy saved · Wet · Heavy');
  await expect(page.getByRole('timer')).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Right' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByText('Paused · Right')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('paused.png') });
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await expect
    .poll(
      async () => {
        const sides = (await page.getByText(/^Left \d+:\d\d · Right \d+:\d\d$/).textContent()) ?? '';
        const [left = 0, right = 0] = [...sides.matchAll(/(\d+):(\d\d)/g)].map((m) => Number(m[1]) * 60 + Number(m[2]));
        return right - left;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThanOrEqual(2);

  await page.getByRole('button', { name: 'End feed' }).click();
  await expect(page.getByText(/^Fed /)).toBeVisible();
  await page.getByRole('button', { name: "Olivia's asleep" }).click();
  await expect(page.getByRole('status')).toContainText('Nap started');
  await expect(page.getByRole('button', { name: /^End nap/ })).toBeVisible();
  await page.getByRole('button', { name: 'Pause nap' }).click();
  await expect(page.getByText('Awake · paused')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('nap-paused.png') });
  await page.getByRole('button', { name: 'Resume nap' }).click();
  await expect(page.getByRole('button', { name: 'Pause nap' })).toBeVisible();
  await page.getByRole('button', { name: /^End nap/ }).click();
  await expect(page.getByRole('status')).toContainText('Nap ended');

  await expect(page.getByText(/^Last fed .+ · just now · Right side/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start left' })).toContainText('Next');
  await expect(page.getByRole('button', { name: 'Start left' })).toContainText(/Last feed \d+m/);
  await expect(page.getByRole('button', { name: 'Start right' })).toContainText(/Last feed \d+m/);
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
  await expect(page.getByRole('status')).toContainText('Resumed the last feed');
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('feeding.png') });
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('status')).toContainText('Feed discarded');
  await expect(page.getByRole('button', { name: 'Start right' })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Feeding · Right')).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByRole('button', { name: 'Start right' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 7_000 });

  await page.getByRole('button', { name: 'Start left' }).click();
  await expect(page.getByText('Feeding · Left')).toBeVisible();
  await page.getByRole('button', { name: 'End feed' }).click();
  await page.screenshot({ path: testInfo.outputPath('ended.png') });
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByRole('button', { name: 'Start right' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sleep' })).toBeVisible();

  await page.goto('/track/nappy');
  await expect(page.getByText('Wet').first()).toBeVisible();
});

test('on the Pi, chair mode hides its full screen button', async ({ page }, testInfo) => {
  const email = uniqueEmail('john', testInfo.project.name);
  await signUpWithPassword(page, email);
  await onboard(page);
  joinPlus(email);

  await page.goto('/chair');
  await expect(page.getByRole('button', { name: 'Full screen' })).toBeVisible();
  await page.goto('/chair?kiosk=1&screenOff=30');
  await expect(page.getByText('No feeds logged yet')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full screen' })).toHaveCount(0);
});
