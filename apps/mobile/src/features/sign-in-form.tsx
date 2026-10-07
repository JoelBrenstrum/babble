import { MIN_PASSWORD_LENGTH, type InstanceSettings } from '@babble/api';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button } from '@/components/button';
import { Segmented } from '@/components/segmented';
import { StatusMessage } from '@/components/status-message';
import { TextField } from '@/components/text-field';

type Mode = 'signin' | 'signup' | 'link';

export interface SignInFormProps {
  settings: InstanceSettings | undefined;
  googleEnabled: boolean;
  initialInviteCode?: string;
  onPasswordSignIn: (values: { email: string; password: string }) => Promise<void>;
  onSignUp: (values: { email: string; password: string; inviteCode?: string }) => Promise<void>;
  onMagicLink: (values: { email: string; inviteCode?: string }) => Promise<void>;
  onGoogle: () => Promise<void>;
}

export function SignInForm({
  settings,
  googleEnabled,
  initialInviteCode,
  onPasswordSignIn,
  onSignUp,
  onMagicLink,
  onGoogle,
}: SignInFormProps) {
  const [mode, setMode] = useState<Mode>(initialInviteCode ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialInviteCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inviteOnly = settings?.signupMode === 'invite_only' && settings.hasUsers;
  const askInvite = inviteOnly && mode !== 'signin';
  const passwordTooShort = mode === 'signup' && password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const canSubmit =
    email.includes('@') &&
    (mode === 'link' || (mode === 'signup' ? password.length >= MIN_PASSWORD_LENGTH : password.length > 0));

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

  function submit() {
    const invite = askInvite ? inviteCode.trim() || undefined : undefined;
    if (mode === 'signin') return run(() => onPasswordSignIn({ email, password }));
    if (mode === 'signup') return run(() => onSignUp({ email, password, inviteCode: invite }));
    return run(() => onMagicLink({ email, inviteCode: invite }));
  }

  return (
    <View className="gap-5">
      {mode !== 'link' && (
        <Segmented
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
          options={[
            { value: 'signin', label: 'Sign in' },
            { value: 'signup', label: 'Create account' },
          ]}
        />
      )}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
      />
      {mode !== 'link' && (
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          hint={mode === 'signup' ? `At least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
          error={passwordTooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : null}
        />
      )}
      {askInvite && (
        <TextField
          label="Invite code"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          placeholder="K7Q-4MD"
          hint="Ask someone in your family for a code from Settings."
        />
      )}
      {error && <StatusMessage tone="danger">{error}</StatusMessage>}
      <Button size="lg" loading={submitting} disabled={!canSubmit} onPress={submit}>
        {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Email me a sign-in link'}
      </Button>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setMode(mode === 'link' ? 'signin' : 'link');
          setError(null);
        }}
        className="min-h-tap items-center justify-center"
      >
        <Text className="font-semibold text-meta text-primary">
          {mode === 'link' ? 'Use a password instead' : 'Forgot your password? Email me a sign-in link'}
        </Text>
      </Pressable>
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
