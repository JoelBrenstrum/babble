import { Screen } from '@/components/screen';
import { HomeOverview } from '@/features/home-overview';
import { useReadyState } from '@/lib/use-onboarding';

export default function Home() {
  const ready = useReadyState();
  if (!ready) return null;
  return (
    <Screen edges={['top']}>
      <HomeOverview family={ready.family} baby={ready.baby} />
    </Screen>
  );
}
