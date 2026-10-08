import { expect, test } from '@playwright/test';

test('the page sets a status bar colour for both light and dark mode', async ({ page }) => {
  await page.goto('/sign-in');
  const media = await page
    .locator('meta[name="theme-color"]')
    .evaluateAll((tags) => tags.map((tag) => tag.getAttribute('media')));
  expect(media).toEqual(['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)']);
});
