import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: ['inherit', 'pipe', 'inherit'], encoding: 'utf8', ...options });

const [build] = JSON.parse(
  run('npx', ['eas-cli@latest', 'build', '--platform', 'android', '--profile', 'preview', '--wait', '--json']),
);
const url = build?.artifacts?.buildUrl ?? build?.artifacts?.applicationArchiveUrl;
if (!url) throw new Error(`EAS build ${build?.id} finished without an APK`);

const apk = join(mkdtempSync(join(tmpdir(), 'babble-apk-')), 'babble.apk');
const response = await fetch(url);
if (!response.ok) throw new Error(`Downloading ${url} failed: ${response.status}`);
writeFileSync(apk, Buffer.from(await response.arrayBuffer()));

const tag = `android-v${build.appVersion}-${build.appBuildVersion}`;
run(
  'gh',
  [
    'release',
    'create',
    tag,
    apk,
    '--title',
    `Android ${build.appVersion} (${build.appBuildVersion})`,
    '--notes',
    `EAS build ${build.id}`,
    '--latest',
  ],
  { stdio: 'inherit' },
);
console.log(`Published ${tag}: https://babble.brenstrum.com/downloads`);
