const INVITE_ALPHABET = /^(?:[2-9A-HJ-NP-Z]{6}|[2-9A-HJ-NP-Z]{10})$/;

export function normalizeInviteCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (compact.length === 10) return `${compact.slice(0, 5)}-${compact.slice(5)}`;
  return compact.length === 6 ? `${compact.slice(0, 3)}-${compact.slice(3)}` : compact;
}

export function isValidInviteCode(input: string): boolean {
  return INVITE_ALPHABET.test(normalizeInviteCode(input).replace('-', ''));
}
