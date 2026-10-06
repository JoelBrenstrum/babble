import type { InstanceSettings } from '@babble/api';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/button';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';

export interface SignInFormProps {
  settings: InstanceSettings | undefined;
  googleEnabled: boolean;
  initialInviteCode?: string;
  onMagicLink: (values: { email: string; inviteCode?: string }) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function SignInForm({ settings, googleEnabled, initialInviteCode, onMagicLink, onGoogle }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inviteOnly = settings?.signupMode === 'invite_only' && settings.hasUsers;

  async function run(action: () => Promise<void>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-5">
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      {inviteOnly && (
        <TextField
          label="Invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          placeholder="K7Q-4MD"
          hint="Only needed the first time you sign in."
        />
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button
        size="lg"
        loading={submitting}
        disabled={!email.includes('@')}
        onPress={() => run(() => onMagicLink({ email, inviteCode: inviteCode.trim() || undefined }))}
      >
        Email me a sign-in link
      </Button>
      {googleEnabled && (
        <>
          <Text className="text-center font-sans text-meta text-ink-3">or</Text>
          <Button size="lg" variant="secondary" onPress={() => run(onGoogle)}>
            Continue with Google
          </Button>
        </>
      )}
    </View>
  );
}
