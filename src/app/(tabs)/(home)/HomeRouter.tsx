import { useRouter } from 'expo-router';
import { LeagueChrome } from '@/components/LeagueChrome';
import DiscoveryScreen from './DiscoveryScreen';

export default function HomeRouter() {
  const router = useRouter();

  return (
    <LeagueChrome onLeagueSelected={() => router.push('/(tabs)/(matches)')}>
      {({ openLeagueSheet, openDrawer }) => (
        <DiscoveryScreen
          onOpenLeagueSheet={openLeagueSheet}
          onOpenDrawer={openDrawer}
        />
      )}
    </LeagueChrome>
  );
}
