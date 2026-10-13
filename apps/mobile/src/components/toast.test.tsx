import { toastFromNotice } from './toast';

describe('toastFromNotice', () => {
  it('maps a plain message', () => {
    expect(toastFromNotice({ message: 'Saved' })).toEqual({ message: 'Saved' });
  });

  it('maps the action callback to onPress', () => {
    const run = jest.fn();
    const toast = toastFromNotice({ message: 'Entry deleted', action: { label: 'Undo', run } });
    toast.action?.onPress();
    expect(toast.action?.label).toBe('Undo');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
