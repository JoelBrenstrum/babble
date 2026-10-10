import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';
import { parseTokenCss, renderNativePreset, renderVarsModule, renderWebCss } from './build.ts';

const file = (path: string) => new URL(`../${path}`, import.meta.url);
const read = (path: string) => readFileSync(file(path), 'utf8');

const SAMPLE = `
/* comment */
:root, [data-theme="light"] {
  --bg: 243 240 232; /* #f3f0e8 */
  --primary: 86 99 63;
  --shadow-raised: 0 1px 2px rgb(31 33 28 / 0.07);
}
.dark, [data-theme="dark"] {
  --bg: 20 22 18;
  --primary: 174 191 146;
}
:root {
  --poo-yellow: 232 197 71;
  --font-sans: "Figtree", system-ui, sans-serif;
}
`;

describe('parseTokenCss', () => {
  it('splits light, dark and poo colours and ignores non-colour variables', () => {
    expect(parseTokenCss(SAMPLE)).toEqual({
      light: { bg: '243 240 232', primary: '86 99 63' },
      dark: { bg: '20 22 18', primary: '174 191 146' },
      poo: { yellow: '232 197 71' },
    });
  });

  it('rejects a dark theme with missing colours', () => {
    expect(() => parseTokenCss(SAMPLE.replace('--primary: 174 191 146;', ''))).toThrow(
      'Dark theme is missing: primary',
    );
  });

  it('parses the real design tokens', () => {
    const tokens = parseTokenCss(read('css/babble-tokens.css'));
    expect(tokens.light.primary).toBe('86 99 63');
    expect(tokens.dark.bg).toBe('20 22 18');
    expect(Object.keys(tokens.poo)).toEqual([
      'yellow',
      'mustard',
      'green',
      'dark-green',
      'brown',
      'orange',
      'black',
      'red',
      'white-grey',
    ]);
    for (const tracker of [
      'sleep',
      'feed-left',
      'feed-right',
      'bottle',
      'solids',
      'nappy',
      'pump',
      'growth',
      'custom',
    ]) {
      expect(tokens.light).toHaveProperty(tracker);
      expect(tokens.light).toHaveProperty(`${tracker}-soft`);
      expect(tokens.light).toHaveProperty(`on-${tracker}`);
    }
  });
});

describe('generated files', () => {
  const tokens = parseTokenCss(read('css/babble-tokens.css'));

  it.each([
    ['css/web.css', () => renderWebCss(tokens)],
    ['nativewind-preset.cjs', () => renderNativePreset(tokens)],
    ['src/generated/vars.ts', () => renderVarsModule(tokens)],
  ])('%s is up to date (run `pnpm generate`)', async (path, render) => {
    const options = await prettier.resolveConfig(fileURLToPath(file(path)));
    const expected = await prettier.format(render(), { ...options, filepath: fileURLToPath(file(path)) });
    expect(read(path)).toBe(expected);
  });

  it('maps every colour into the web theme and the native preset', () => {
    const web = read('css/web.css');
    const native = read('nativewind-preset.cjs');
    for (const name of Object.keys(tokens.light)) {
      expect(web).toContain(`--color-${name}: rgb(var(--${name}));`);
      expect(native).toContain(`rgb(var(--${name}) / <alpha-value>)`);
    }
  });
});
