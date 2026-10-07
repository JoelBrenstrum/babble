import { describe, expect, it } from 'vitest';
import { configProblem } from './config-problem';

describe('configProblem', () => {
  it('recognises missing or invalid settings', () => {
    expect(configProblem(new Error('SUPABASE_ANON_KEY is required'))).toBe('SUPABASE_ANON_KEY is required');
    expect(configProblem(new Error('PUBLIC_URL must be a valid URL, got "x"'))).toBe(
      'PUBLIC_URL must be a valid URL, got "x"',
    );
  });

  it('ignores other errors', () => {
    expect(configProblem(new Error('Failed to fetch'))).toBeNull();
    expect(configProblem(null)).toBeNull();
  });
});
