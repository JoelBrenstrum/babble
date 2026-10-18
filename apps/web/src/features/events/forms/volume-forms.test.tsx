import { emptyDraft, type Units } from '@babble/domain';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BottleForm } from './bottle-form';
import { PumpForm } from './pump-form';

const NOW = new Date('2026-10-06T10:00:00Z');
const common = { onChange: () => {}, errors: {}, timeZone: 'Pacific/Auckland', isNew: true };

function renderBottle(units: Units) {
  const draft = emptyDraft('bottle', NOW);
  render(
    <BottleForm
      {...common}
      units={units}
      draft={{ ...draft, details: { ...draft.details, amountMl: 118, amountLeftMl: 30 } }}
    />,
  );
}

function renderPump(units: Units) {
  const draft = emptyDraft('pump', NOW);
  render(
    <PumpForm
      {...common}
      units={units}
      draft={{ ...draft, details: { ...draft.details, leftMl: 89, rightMl: null } }}
    />,
  );
}

describe('volume forms', () => {
  it('shows bottle amounts in millilitres', () => {
    renderBottle('metric');
    expect(screen.getByLabelText('Amount')).toHaveValue('118');
    expect(screen.getByLabelText('Left over (optional)')).toHaveValue('30');
  });

  it('shows bottle amounts in ounces to one decimal', () => {
    renderBottle('imperial');
    expect(screen.getByLabelText('Amount')).toHaveValue('4');
    expect(screen.getByLabelText('Left over (optional)')).toHaveValue('1');
  });

  it('shows pump amounts in the chosen units and leaves blanks alone', () => {
    renderPump('imperial');
    expect(screen.getByLabelText('Left amount')).toHaveValue('3');
    expect(screen.getByLabelText('Right amount')).toHaveValue('');
  });
});
