import { DEV_ACCOUNTS, DEV_PASSWORD, toBabbleError } from '@babble/api';
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
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string) {
    setError(null);
    setPending(email);
    try {
      await onSignIn({ email, password: DEV_PASSWORD });
    } catch (caught) {
      setError(`${toBabbleError(caught).message} Run \`pnpm --filter @babble/db reset\` to reseed the dev accounts.`);
      setPending(null);
    }
  }

  return (
    <View
      accessibilityLabel="Development sign-in"
      className="mt-10 gap-3 rounded-card border border-dashed border-line-strong p-4"
    >
      <Text className="font-semibold text-meta text-ink-2">Development only</Text>
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
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
    </View>
  );
}
