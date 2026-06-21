import { useRouter } from 'expo-router';
import { LeagueChrome } from '@/components/LeagueChrome';
import { useLeague } from '@/contexts/LeagueContext';
import DiscoveryScreen from './DiscoveryScreen';

// Home always shows the cross-sport Discovery feed. Picking a league (via the
// sport pills, the league sheet, or a banner) hands off to the dedicated
// per-league home tab instead of swapping views in place.
export default function HomeRouter() {
  const router = useRouter();
  const { setLeagueId } = useLeague();

  function goToLeagueHome(slug: string) {
    setLeagueId(slug);
    router.push('/(tabs)/(leaguehome)');
  }

  return (
    <LeagueChrome onLeagueSelected={() => router.push('/(tabs)/(leaguehome)')}>
      {({ openLeagueSheet, openDrawer }) => (
        <DiscoveryScreen
          onOpenLeagueSheet={openLeagueSheet}
          onOpenDrawer={openDrawer}
          onNavigateLeagueHome={goToLeagueHome}
        />
      )}
    </LeagueChrome>
  );
}
