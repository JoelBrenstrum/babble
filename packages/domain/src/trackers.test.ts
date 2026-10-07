import { describe, expect, it } from 'vitest';
import { isEventType, isSessionType, listTypesFor, trackerFor } from './trackers';

describe('trackers', () => {
  it('recognises event types', () => {
    expect(isEventType('nappy')).toBe(true);
    expect(isEventType('medicine')).toBe(false);
  });

  it('knows which trackers have timers', () => {
    expect(isSessionType('breast_feed')).toBe(true);
    expect(isSessionType('bottle')).toBe(false);
  });

  it('looks up tracker metadata', () => {
    expect(trackerFor('pump')).toMatchObject({ label: 'Pump', token: 'pump' });
  });

  it('combines feeds unless filtered', () => {
    expect(listTypesFor('breast_feed')).toEqual(['breast_feed', 'bottle']);
    expect(listTypesFor('bottle', 'bottle')).toEqual(['bottle']);
    expect(listTypesFor('breast_feed', 'breast')).toEqual(['breast_feed']);
    expect(listTypesFor('nappy', 'bottle')).toEqual(['nappy']);
  });
});
