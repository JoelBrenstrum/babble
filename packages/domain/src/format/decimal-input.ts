export function sanitizeDecimalInput(text: string, maxDecimals = 2): string {
  const normalised = text.replace(',', '.').replace(/[^0-9.]/g, '');
  const [whole = '', ...rest] = normalised.split('.');
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join('').slice(0, maxDecimals)}`;
}

export function parseDecimalInput(text: string): number | null {
  if (text === '' || text === '.') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}
