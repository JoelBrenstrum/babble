import { DEV_ACCOUNTS, DEV_PASSWORD } from '@babble/api/dev';
import { useAsyncAction } from '@babble/api/react';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { StatusMessage } from '@/components/status-message';

export function DevSignIn({
  onSignIn,
}: {
  onSignIn: (credentials: { email: string; password: string }) => Promise<void>;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const { run, error } = useAsyncAction();

  async function signIn(email: string) {
    setPending(email);
    if (!(await run(() => onSignIn({ email, password: DEV_PASSWORD })))) setPending(null);
  }

  return (
    <View
      accessibilityLabel="Development sign-in"
      className="mt-10 gap-3 rounded-card border border-dashed border-line-strong p-4"
    >
      <Text className="font-semibold text-meta text-ink-2">Development only</Text>
      <Text className="font-sans text-meta text-ink-2">John and Jane share a Plus family. Sam has a free family.</Text>
      {DEV_ACCOUNTS.map((account) => (
        <Button
          key={account.email}
          variant="secondary"
          loading={pending === account.email}
          disabled={pending !== null && pending !== account.email}
          onPress={() => signIn(account.email)}
        >
          {`Sign in as ${account.name}`}
        </Button>
      ))}
      {error && (
        <StatusMessage tone="danger">{`${error} Run \`pnpm --filter @babble/db reset\` to reseed the dev accounts.`}</StatusMessage>
      )}
    </View>
  );
}
