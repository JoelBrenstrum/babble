import { describe, expect, it } from 'vitest';
import { parseCsv } from './parse-csv';

describe('parseCsv', () => {
  it('parses quoted and unquoted fields', () => {
    expect(parseCsv('"a",b,,"d"\n')).toEqual([['a', 'b', '', 'd']]);
  });

  it('handles escaped quotes, commas and newlines inside quotes', () => {
    expect(parseCsv('"say ""hi""","x, y","line1\nline2"')).toEqual([['say "hi"', 'x, y', 'line1\nline2']]);
  });

  it('handles CRLF line endings and a byte order mark', () => {
    expect(parseCsv('﻿a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps a trailing empty field', () => {
    expect(parseCsv('a,b,\n')).toEqual([['a', 'b', '']]);
  });
});
