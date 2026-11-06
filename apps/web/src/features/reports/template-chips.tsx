import { REPORT_TEMPLATES, templateName } from '@babble/domain';
import { Link } from '@tanstack/react-router';
import { TEMPLATE_ICONS } from './report-icons';

export function TemplateChips({ babyName }: { babyName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-label font-semibold text-ink-2">Start from</h2>
      <ul className="flex flex-wrap gap-2">
        {REPORT_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.icon];
          return (
            <li key={template.key}>
              <Link
                to="/reports/new"
                search={{ template: template.key }}
                title={template.description}
                className="inline-flex h-11 items-center gap-2 rounded-chip border border-line bg-raised px-4 text-label font-semibold text-ink hover:bg-surface"
              >
                <Icon className="size-4 text-primary" strokeWidth={2.75} />
                {templateName(template, babyName)}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
