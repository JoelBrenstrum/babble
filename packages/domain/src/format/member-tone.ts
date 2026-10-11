export const MEMBER_TONES = ['secondary', 'growth', 'sleep', 'info', 'pump', 'bottle'] as const;
export type MemberTone = (typeof MEMBER_TONES)[number];

export type MemberToneMap = ReadonlyMap<string, MemberTone>;

type ToneMember = { display_name: string; created_at: string; user_id: string };

function key(name: string): string {
  return name.trim().toLowerCase();
}

export function memberTones(members: readonly ToneMember[]): MemberToneMap {
  const ordered = [...members].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.user_id.localeCompare(b.user_id),
  );
  const tones = new Map<string, MemberTone>();
  for (const member of ordered) {
    if (!tones.has(key(member.display_name)))
      tones.set(key(member.display_name), MEMBER_TONES[tones.size % MEMBER_TONES.length]!);
  }
  return tones;
}

export function toneFor(name: string, tones: MemberToneMap): MemberTone {
  const known = tones.get(key(name));
  if (known) return known;
  let hash = 0;
  for (const char of key(name)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return MEMBER_TONES[hash % MEMBER_TONES.length]!;
}
