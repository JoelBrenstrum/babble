import { Redirect, Stack } from 'expo-router';
import { PageSpinner } from '@/components/page-spinner';
import { useBabble } from '@/lib/babble';

export default function OnboardingLayout() {
  const { session, sessionLoaded } = useBabble();
  if (!sessionLoaded) return <PageSpinner />;
  if (!session) return <Redirect href="/sign-in" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />;
}
