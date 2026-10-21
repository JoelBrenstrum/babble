import { emptyDraft, type DraftOfType } from '@babble/domain';
import { render, screen } from '@testing-library/react-native';
import { PumpForm } from './pump-form';

const draft: DraftOfType<'pump'> = {
  ...emptyDraft('pump', new Date('2026-10-06T10:00:00Z')),
  details: { leftMl: 59, rightMl: null, totalMl: null },
};

describe('PumpForm', () => {
  it('shows amounts in ounces to one decimal for imperial units', async () => {
    await render(
      <PumpForm draft={draft} onChange={jest.fn()} errors={{}} timeZone="Pacific/Auckland" units="imperial" isNew />,
    );
    expect(screen.getByLabelText('Left amount').props.value).toBe('2');
    expect(screen.getByLabelText('Right amount').props.value).toBe('');
    expect(screen.getByText('Total 2 oz')).toBeTruthy();
  });
});
