import { babyChoices } from '@babble/api';
import { sampleFamily } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { SettingsBabyPicker } from './settings-baby-picker';

const choices = babyChoices([sampleFamily]);

async function renderPicker(addBabyLocked: boolean, onSelect = vi.fn()) {
  render(
    <FixtureRouter>
      <SettingsBabyPicker choices={choices} activeId="baby-olivia" onSelect={onSelect} addBabyLocked={addBabyLocked} />
    </FixtureRouter>,
  );
  await screen.findByRole('radiogroup', { name: 'Baby' });
  return onSelect;
}

describe('SettingsBabyPicker', () => {
  it('marks the baby being edited and switches to another', async () => {
    const onSelect = await renderPicker(false);
    expect(screen.getByRole('radio', { name: /Olivia/, checked: true })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Jacob/ }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ baby: expect.objectContaining({ name: 'Jacob' }) }),
    );
  });

  it('does nothing when the current baby is picked again', async () => {
    const onSelect = await renderPicker(false);
    await userEvent.click(screen.getByRole('radio', { name: /Olivia/ }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('links to adding a baby', async () => {
    await renderPicker(false);
    expect(screen.getByRole('link', { name: 'Add a baby' })).toHaveAttribute('href', '/onboarding/baby?mode=add');
  });

  it('pitches Plus when adding a baby is locked', async () => {
    await renderPicker(true);
    expect(screen.queryByRole('link', { name: 'Add a baby' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Add a baby/ }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Babble Plus');
  });
});
