import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ActiveBabyProvider, useActiveBaby } from './active-baby';

let mockEpoch = 0;
jest.mock('./babble', () => ({ useBabble: () => ({ accountEpoch: mockEpoch }) }));

const wrapper = ({ children }: { children: ReactNode }) => <ActiveBabyProvider>{children}</ActiveBabyProvider>;

describe('ActiveBabyProvider', () => {
  beforeEach(async () => {
    mockEpoch = 0;
    await AsyncStorage.clear();
  });

  it('restores the stored selection', async () => {
    await AsyncStorage.setItem('babble.activeBaby', JSON.stringify({ familyId: 'f1', babyId: 'b1' }));
    const { result } = await renderHook(() => useActiveBaby(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current).toMatchObject({ familyId: 'f1', babyId: 'b1' });
  });

  it('ignores a malformed stored selection', async () => {
    await AsyncStorage.setItem('babble.activeBaby', '{"familyId": 4}');
    const { result } = await renderHook(() => useActiveBaby(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current).toMatchObject({ familyId: null, babyId: null });
  });

  it('persists a selection', async () => {
    const { result } = await renderHook(() => useActiveBaby(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    await act(() => result.current.select({ familyId: 'f2', babyId: 'b2' }));
    expect(result.current).toMatchObject({ familyId: 'f2', babyId: 'b2' });
    expect(await AsyncStorage.getItem('babble.activeBaby')).toBe(JSON.stringify({ familyId: 'f2', babyId: 'b2' }));
  });

  it('forgets the selection when the account changes', async () => {
    await AsyncStorage.setItem('babble.activeBaby', JSON.stringify({ familyId: 'f1', babyId: 'b1' }));
    const { result, rerender } = await renderHook(() => useActiveBaby(), { wrapper });
    await waitFor(() => expect(result.current.babyId).toBe('b1'));
    mockEpoch = 1;
    await rerender({});
    await waitFor(() => expect(result.current).toMatchObject({ familyId: null, babyId: null }));
    expect(await AsyncStorage.getItem('babble.activeBaby')).toBeNull();
  });
});
