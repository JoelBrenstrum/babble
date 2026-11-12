import { Download } from 'lucide-react';
import { buttonClassName } from '#/components/ui/button';
import { Card } from '#/components/ui/card';
import { Wordmark } from '#/components/ui/wordmark';
import { InstallInstructions } from './install-app';

export const ANDROID_APK_URL = 'https://github.com/JoelBrenstrum/babble/releases/latest/download/babble.apk';

export function Downloads() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="px-6 py-5">
        <a href="/" aria-label="babble home">
          <Wordmark className="text-[28px]" />
        </a>
      </header>
      <main className="mx-auto flex w-full max-w-prose flex-col gap-6 px-4 pb-16 pt-4 sm:pt-10">
        <h1 className="text-title font-bold">Get the app</h1>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-row-title font-bold">Android</h2>
          <p className="text-body text-ink-2">
            Download the APK on your phone and open it. Android will ask you to allow installs from your browser the
            first time.
          </p>
          <a href={ANDROID_APK_URL} className={buttonClassName({ className: 'self-start' })}>
            <Download className="size-5" strokeWidth={2.75} />
            Download for Android
          </a>
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <h2 className="text-row-title font-bold">iPhone</h2>
          <p className="text-body text-ink-2">
            babble isn't on the App Store yet. Add it to your home screen from Safari:
          </p>
          <InstallInstructions mode="ios-safari" onInstall={() => {}} />
        </Card>
      </main>
    </div>
  );
}
