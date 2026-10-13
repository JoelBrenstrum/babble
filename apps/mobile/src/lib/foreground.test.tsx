import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import { focusEventListener, onForeground, useForegroundCount, type AppStateSubscribe } from './foreground';

function fakeSubscribe() {
  const listeners = new Set<(state: AppStateStatus) => void>();
  const subscribe: AppStateSubscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const emit = (state: AppStateStatus) => listeners.forEach((listener) => listener(state));
  return { subscribe, emit, listeners };
}

describe('focusEventListener', () => {
  it('reports focus only while the app is active', () => {
    const { subscribe, emit } = fakeSubscribe();
    const handleFocus = jest.fn();
    focusEventListener(subscribe)(handleFocus);
    emit('background');
    emit('active');
    emit('inactive');
    expect(handleFocus.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('stops listening when torn down', () => {
    const { subscribe, listeners } = fakeSubscribe();
    const teardown = focusEventListener(subscribe)(jest.fn());
    expect(listeners.size).toBe(1);
    teardown();
    expect(listeners.size).toBe(0);
  });
});

describe('onForeground', () => {
  it('fires only when the app returns to the foreground', () => {
    const { subscribe, emit } = fakeSubscribe();
    const listener = jest.fn();
    onForeground(listener, subscribe);
    emit('background');
    expect(listener).not.toHaveBeenCalled();
    emit('active');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('useForegroundCount', () => {
  it('counts each return to the foreground', async () => {
    let listener: (state: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, next) => {
      listener = next as (state: AppStateStatus) => void;
      return { remove: jest.fn() };
    });
    const { result } = await renderHook(() => useForegroundCount());
    expect(result.current).toBe(0);
    await act(() => listener('active'));
    await act(() => listener('background'));
    await act(() => listener('active'));
    expect(result.current).toBe(2);
  });
});
