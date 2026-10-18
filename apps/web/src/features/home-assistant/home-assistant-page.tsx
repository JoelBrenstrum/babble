import { Link } from '@tanstack/react-router';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { buttonClassName } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { Wordmark } from '#/components/ui/wordmark';
import { PlusBadge } from '#/features/plus-dialog';
import { EXAMPLES, HOME_ASSISTANT_REPO_URL, SENSOR_GROUPS, type Example } from './examples';

const linkClass = 'font-semibold text-primary underline-offset-2 hover:underline';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard?.writeText(text).then(() => setCopied(true));
  }
  return (
    <button type="button" onClick={copy} className={buttonClassName({ variant: 'secondary', className: 'shrink-0' })}>
      {copied ? <Check className="size-4" strokeWidth={2.75} /> : <Copy className="size-4" strokeWidth={2.75} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function ExampleCard({ example }: { example: Example }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-row-title font-bold">{example.title}</h3>
        <CopyButton text={example.yaml} />
      </div>
      <p className="text-body text-ink-2">{example.body}</p>
      <pre className="overflow-x-auto rounded-tile bg-surface p-4 text-[13px] leading-relaxed">
        <code>{example.yaml}</code>
      </pre>
    </Card>
  );
}

export function HomeAssistantPage({ serverUrl, billingEnabled }: { serverUrl: string; billingEnabled: boolean }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6">
        <Link to="/welcome" aria-label="babble home" className="rounded-button">
          <Wordmark className="text-[28px]" />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-20 pt-4 sm:px-6 sm:pt-8">
        <section className="flex flex-col gap-3">
          <h1 className="text-title font-bold">babble for Home Assistant</h1>
          <p className="text-body text-ink-2">
            Put naps and the next feed on a home dashboard, like an e-ink screen on the fridge, and build automations
            around them. Each baby shows up as a device, updated every 30 seconds.
          </p>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="what-you-get">
          <h2 id="what-you-get" className="text-heading font-bold">
            What you get
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {SENSOR_GROUPS.map((group) => (
              <Card key={group.title} className="p-5">
                <h3 className="text-row-title font-semibold">{group.title}</h3>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-meta text-ink-2">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
          <p className="text-body text-ink-2">
            You can control babble from Home Assistant too: switches start and stop a nap or each breastfeeding side,
            and actions log nappies, bottles, solids, pumping and growth, at an earlier time if you need.
          </p>
          {billingEnabled && (
            <p className="flex flex-wrap items-center gap-2 text-meta text-ink-2">
              Predicted naps and feeds need <PlusBadge />
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="set-up">
          <h2 id="set-up" className="text-heading font-bold">
            Set it up
          </h2>
          <ol className="flex list-decimal flex-col gap-3 pl-5 text-body">
            <li>
              In HACS, open the menu, choose <strong>Custom repositories</strong> and add{' '}
              <a href={HOME_ASSISTANT_REPO_URL} className={linkClass}>
                {HOME_ASSISTANT_REPO_URL.replace('https://', '')}
              </a>{' '}
              as an Integration. Download <strong>babble</strong>, then restart Home Assistant.
            </li>
            <li>
              Go to <strong>Settings → Devices &amp; services → Add integration</strong>, pick babble and enter{' '}
              <code className="rounded bg-surface px-1.5 py-0.5 text-meta">{serverUrl}</code>.
            </li>
            <li>
              Home Assistant shows a code. Open the link it gives you on a phone that's signed in to babble and approve
              it, just like signing in the chair screen.
            </li>
            <li>
              Home Assistant now appears in babble under <strong>Settings → Signed-in devices</strong>. Rename it there,
              or sign it out to disconnect it.
            </li>
          </ol>
          <p className="text-meta text-ink-2">
            Home Assistant signs in as the person who approves it, so it can see and log what they can. Approve it from
            a read-only member if you only want a dashboard.
          </p>
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="examples">
          <h2 id="examples" className="text-heading font-bold">
            Examples
          </h2>
          <p className="text-body text-ink-2">
            These use a baby called Olive. Replace <code className="text-meta">olive</code> with your baby's name.
          </p>
          {EXAMPLES.map((example) => (
            <ExampleCard key={example.title} example={example} />
          ))}
        </section>
      </main>
    </div>
  );
}
