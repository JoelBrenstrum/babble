export function parseBooleanParam(value: unknown): true | undefined {
  return value === true || value === 'true' || value === 1 || value === '1' ? true : undefined;
}

export function parseOptionParam<T extends string>(value: unknown, options: readonly T[]): T | undefined {
  return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : undefined;
}
