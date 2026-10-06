import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseTokenCss, renderNativePreset, renderVarsModule, renderWebCss } from '../src/build.ts';

const root = new URL('../', import.meta.url);
const tokens = parseTokenCss(readFileSync(new URL('css/babble-tokens.css', root), 'utf8'));

mkdirSync(new URL('src/generated/', root), { recursive: true });
writeFileSync(new URL('css/web.css', root), renderWebCss(tokens));
writeFileSync(new URL('nativewind-preset.cjs', root), renderNativePreset(tokens));
writeFileSync(new URL('src/generated/vars.ts', root), renderVarsModule(tokens));
