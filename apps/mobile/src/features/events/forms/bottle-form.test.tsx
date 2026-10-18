import { emptyDraft, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { BottleForm } from './bottle-form';

const draft: DraftOfType<'bottle'> = {
  ...emptyDraft('bottle', new Date('2026-10-06T10:00:00Z')),
  details: { content: 'formula', amountMl: 118, amountLeftMl: 30 },
};

describe('BottleForm', () => {
  it('shows amounts in millilitres for metric units', async () => {
    await render(
      <BottleForm draft={draft} onChange={jest.fn()} errors={{}} timeZone="Pacific/Auckland" units="metric" isNew />,
    );
    expect(screen.getByLabelText('Amount').props.value).toBe('118');
    expect(screen.getByLabelText('Left over (optional)').props.value).toBe('30');
  });

  it('shows amounts in ounces to one decimal for imperial units', async () => {
    await render(
      <BottleForm draft={draft} onChange={jest.fn()} errors={{}} timeZone="Pacific/Auckland" units="imperial" isNew />,
    );
    expect(screen.getByLabelText('Amount').props.value).toBe('4');
    expect(screen.getByLabelText('Left over (optional)').props.value).toBe('1');
  });
});
