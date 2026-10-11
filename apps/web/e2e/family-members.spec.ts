import { expect, test } from '@playwright/test';
import { setSignupMode } from './db';
import { onboard, signUpWithPassword, uniqueEmail } from './helpers';

test.beforeAll(() => setSignupMode('open'));
test.afterAll(() => setSignupMode('invite_only'));

test('the owner renames and removes a caregiver', async ({ page, browser }, testInfo) => {
  await signUpWithPassword(page, uniqueEmail('john', testInfo.project.name));
  await onboard(page);
  await page.goto('/settings');
  const inviteText = await page
    .getByRole('list', { name: 'Pending invites' })
    .getByRole('listitem')
    .first()
    .innerText();
  const code = inviteText.match(/[A-Z0-9]{5}-[A-Z0-9]{5}|[A-Z0-9]{3}-[A-Z0-9]{3}/)![0];

  const janeContext = await browser.newContext();
  const jane = await janeContext.newPage();
  await signUpWithPassword(jane, uniqueEmail('jane', testInfo.project.name));
  await expect(jane.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await jane.goto(`/join/${code}`);
  await jane.getByLabel('Your name').fill('Jane');
  await jane.getByRole('button', { name: 'Join family' }).click();
  await expect(jane.getByText('Breastfeed')).toBeVisible();

  await jane.goto('/settings');
  const janeMembers = jane.getByRole('list', { name: 'Family members' });
  await expect(janeMembers.getByRole('button', { name: 'Rename Jane' })).toBeVisible();
  await expect(janeMembers.getByRole('button', { name: 'Rename John' })).toHaveCount(0);
  await expect(janeMembers.getByRole('button', { name: /^Remove/ })).toHaveCount(0);

  await page.reload();
  const members = page.getByRole('list', { name: 'Family members' });
  await members.getByRole('button', { name: 'Rename Jane' }).click();
  await page.getByLabel("Jane's name").fill('Nana');
  await members.getByRole('button', { name: 'Save' }).click();
  await expect(members.getByText('Nana', { exact: true })).toBeVisible();

  await members.getByRole('button', { name: 'Remove Nana' }).click();
  await expect(page.getByText(/Remove Nana from The Smiths\?/)).toBeVisible();
  await members.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(members.getByText('Nana', { exact: true })).toHaveCount(0);

  await jane.goto('/');
  await expect(jane.getByRole('heading', { name: 'Set up your family' })).toBeVisible();
  await janeContext.close();
});
