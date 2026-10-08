import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { authTemplatePatch, TEMPLATE_KINDS, templateSubjects } from './email-templates.ts';

describe('templateSubjects', () => {
  it('reads every subject from the real config', () => {
    const subjects = templateSubjects(readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8'));
    assert.equal(subjects.magic_link, 'Your babble sign-in link');
    assert.equal(subjects.invite, "You're invited to babble");
  });

  it('ignores commented sections and fails when a subject is missing', () => {
    const toml = TEMPLATE_KINDS.filter((kind) => kind !== 'recovery')
      .map((kind) => `[auth.email.template.${kind}]\nsubject = "Hi \\"${kind}\\""\n`)
      .join('\n');
    assert.throws(() => templateSubjects(`${toml}\n# [auth.email.template.recovery]\n# subject = "x"`), /recovery/);
    assert.equal(templateSubjects(`${toml}\n[auth.email.template.recovery]\nsubject = "r"`).invite, 'Hi "invite"');
  });
});

describe('authTemplatePatch', () => {
  it('names fields the way the Management API expects', () => {
    const subjects = Object.fromEntries(TEMPLATE_KINDS.map((kind) => [kind, `S ${kind}`])) as never;
    const contents = Object.fromEntries(TEMPLATE_KINDS.map((kind) => [kind, `<p>${kind}</p>`])) as never;
    const patch = authTemplatePatch(subjects, contents);
    assert.equal(Object.keys(patch).length, 12);
    assert.equal(patch.mailer_subjects_magic_link, 'S magic_link');
    assert.equal(patch.mailer_templates_email_change_content, '<p>email_change</p>');
  });
});
