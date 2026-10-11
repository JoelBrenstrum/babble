import { describe, expect, it } from 'vitest';
import { MEMBER_TONES, memberTones, toneFor } from './member-tone';

const member = (display_name: string, created_at: string, user_id = display_name) => ({
  display_name,
  created_at,
  user_id,
});

describe('memberTones', () => {
  it('gives each member a different tone in the order they joined', () => {
    const tones = memberTones([member('Jane', '2026-02-01T00:00:00Z'), member('John', '2026-01-01T00:00:00Z')]);
    expect(toneFor('John', tones)).toBe('secondary');
    expect(toneFor('Jane', tones)).toBe('growth');
  });

  it('matches names regardless of case and spacing', () => {
    const tones = memberTones([member('John', '2026-01-01T00:00:00Z'), member('Jane', '2026-02-01T00:00:00Z')]);
    expect(toneFor(' jane ', tones)).toBe('growth');
  });

  it('wraps around after the last tone', () => {
    const many = Array.from({ length: MEMBER_TONES.length + 1 }, (_, index) =>
      member(`Person ${index}`, `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00Z`),
    );
    expect(toneFor(`Person ${MEMBER_TONES.length}`, memberTones(many))).toBe('secondary');
  });
});

describe('toneFor', () => {
  it('picks a stable tone for names outside the family', () => {
    const tones = memberTones([]);
    expect(toneFor('Grandma', tones)).toBe(toneFor('Grandma', tones));
    expect(MEMBER_TONES).toContain(toneFor('Grandma', tones));
  });
});
