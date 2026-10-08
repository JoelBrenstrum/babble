import { readFileSync } from 'node:fs';
import { authTemplatePatch, TEMPLATE_KINDS, templateSubjects } from './email-templates.ts';

const projectRef = process.argv[2];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!projectRef || !token) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=… node scripts/push-email-templates.ts <project-ref>');
  process.exit(1);
}

const supabaseDir = new URL('../supabase/', import.meta.url);
const subjects = templateSubjects(readFileSync(new URL('config.toml', supabaseDir), 'utf8'));
const contents = Object.fromEntries(
  TEMPLATE_KINDS.map((kind) => [kind, readFileSync(new URL(`templates/${kind}.html`, supabaseDir), 'utf8')]),
) as Record<(typeof TEMPLATE_KINDS)[number], string>;

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(authTemplatePatch(subjects, contents)),
});
if (!response.ok) {
  console.error(`Supabase refused the update (${response.status}): ${(await response.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log(`Updated ${TEMPLATE_KINDS.length} email templates on ${projectRef}.`);
