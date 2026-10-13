import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { useNow } from './use-now';

describe('useNow', () => {
  let emit: (state: AppStateStatus) => void;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-13T10:00:00Z') });
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      emit = listener as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('ticks on its interval', async () => {
    const { result } = await renderHook(() => useNow(60_000));
    await act(() => jest.advanceTimersByTime(60_000));
    expect(result.current.toISOString()).toBe('2026-10-13T10:01:00.000Z');
  });

  it('catches up immediately when the app returns to the foreground', async () => {
    const { result } = await renderHook(() => useNow(60_000));
    jest.setSystemTime(new Date('2026-10-13T12:30:00Z'));
    await act(() => emit('background'));
    expect(result.current.toISOString()).toBe('2026-10-13T10:00:00.000Z');
    await act(() => emit('active'));
    expect(result.current.toISOString()).toBe('2026-10-13T12:30:00.000Z');
  });

  it('does nothing while disabled', async () => {
    const { result } = await renderHook(() => useNow(1000, false));
    await act(() => jest.advanceTimersByTime(5000));
    expect(result.current.toISOString()).toBe('2026-10-13T10:00:00.000Z');
  });
});
