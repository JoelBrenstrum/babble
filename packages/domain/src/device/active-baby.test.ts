import { describe, expect, it } from 'vitest';
import { parseActiveBaby } from './active-baby';

describe('parseActiveBaby', () => {
  it('reads a stored selection', () => {
    expect(parseActiveBaby('{"familyId":"f1","babyId":"b1"}')).toEqual({ familyId: 'f1', babyId: 'b1' });
    expect(parseActiveBaby('{"familyId":null,"babyId":null}')).toEqual({ familyId: null, babyId: null });
  });

  it('drops extra fields', () => {
    expect(parseActiveBaby('{"familyId":"f1","babyId":"b1","x":1}')).toEqual({ familyId: 'f1', babyId: 'b1' });
  });

  it.each([
    null,
    '',
    'not json',
    'null',
    '42',
    '"text"',
    '[]',
    '{}',
    '{"familyId":1,"babyId":"b"}',
    '{"familyId":"f"}',
  ])('rejects %j', (value) => expect(parseActiveBaby(value)).toBeNull());
});
