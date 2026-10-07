export function configProblem(error: unknown): string | null {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /^[A-Z][A-Z0-9_]+ (is required|must be)/.test(message) ? message : null;
}
