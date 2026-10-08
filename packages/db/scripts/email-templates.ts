export const TEMPLATE_KINDS = [
  'invite',
  'confirmation',
  'recovery',
  'magic_link',
  'email_change',
  'reauthentication',
] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

export function templateSubjects(configToml: string): Record<TemplateKind, string> {
  const found = new Map<string, string>();
  for (const match of configToml.matchAll(/^\[auth\.email\.template\.(\w+)\]\s*\nsubject = ("(?:[^"\\]|\\.)*")/gm)) {
    found.set(match[1]!, JSON.parse(match[2]!) as string);
  }
  return Object.fromEntries(
    TEMPLATE_KINDS.map((kind) => {
      const subject = found.get(kind);
      if (!subject) throw new Error(`config.toml has no subject for the ${kind} template`);
      return [kind, subject];
    }),
  ) as Record<TemplateKind, string>;
}

export function authTemplatePatch(
  subjects: Record<TemplateKind, string>,
  contents: Record<TemplateKind, string>,
): Record<string, string> {
  return Object.fromEntries(
    TEMPLATE_KINDS.flatMap((kind) => [
      [`mailer_subjects_${kind}`, subjects[kind]],
      [`mailer_templates_${kind}_content`, contents[kind]],
    ]),
  );
}
