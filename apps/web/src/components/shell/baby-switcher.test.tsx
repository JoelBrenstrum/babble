import { babyChoices } from '@babble/api';
import { sampleFamily } from '@babble/api/fixtures';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FixtureRouter } from '#/fixtures/router';
import { BabySwitcher } from './baby-switcher';

const choices = babyChoices([sampleFamily, { ...sampleFamily, id: 'family-2', name: 'Grandparents', babies: [] }]);

async function renderSwitcher(onSelect = vi.fn()) {
  render(
    <FixtureRouter>
      <BabySwitcher choices={choices} activeId="baby-olivia" onSelect={onSelect} layout="sidebar" />
    </FixtureRouter>,
  );
  await screen.findByRole('button', { name: /switch baby/i });
  return onSelect;
}

describe('BabySwitcher', () => {
  it('lists every baby with the active one selected', async () => {
    await renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: /switch baby/i }));
    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      expect.stringContaining('Jacob'),
      expect.stringContaining('Olivia'),
    ]);
    expect(screen.getByRole('option', { name: /Olivia/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('link', { name: 'Add a baby' })).toHaveAttribute('href', '/onboarding/baby?mode=add');
  });

  it('selects another baby and closes', async () => {
    const onSelect = await renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: /switch baby/i }));
    await userEvent.click(screen.getByRole('option', { name: /Jacob/ }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ baby: expect.objectContaining({ name: 'Jacob' }) }),
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape without selecting', async () => {
    const onSelect = await renderSwitcher();
    await userEvent.click(screen.getByRole('button', { name: /switch baby/i }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
