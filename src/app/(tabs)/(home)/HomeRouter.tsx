import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LeagueSheet, type SportTab } from '@/components/LeagueSheet';
import { SideDrawer } from '@/components/SideDrawer';
import type { League } from '@/contexts/LeagueContext';
import DiscoveryScreen from './DiscoveryScreen';
import LeagueHomeScreen from './LeagueHomeScreen';

type HomeView = 'discovery' | 'league';

export default function HomeRouter() {
  const router = useRouter();
  const [homeView,  setHomeView]  = useState<HomeView>('discovery');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetSport, setSheetSport] = useState<SportTab | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Route to navigate to once a league is picked, when the sheet was opened
  // from a drawer item like "Matches" / "Predictions" / "Our Experts".
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  function openLeagueSheet(sport?: SportTab) {
    setSheetSport(sport);
    setSheetOpen(true);
  }

  function openLeagueSheetForRoute(route?: string) {
    if (route) {
      setPendingRoute(route);
      setSheetSport(undefined);
      setSheetOpen(true);
    } else {
      openLeagueSheet();
    }
  }

  function onSelectLeague(_league: League) {
    if (pendingRoute) {
      const route = pendingRoute;
      setPendingRoute(null);
      router.push(route as any);
      return;
    }
    setHomeView('league');
  }

  function backToDiscovery() {
    setHomeView('discovery');
  }

  return (
    <>
      <LeagueSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialSport={sheetSport}
        onSelect={onSelectLeague}
      />
      <SideDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenLeague={openLeagueSheetForRoute}
      />

      {homeView === 'league' ? (
        <LeagueHomeScreen
          onOpenLeagueSheet={openLeagueSheet}
          onOpenDrawer={() => setDrawerOpen(true)}
          onBackToDiscovery={backToDiscovery}
        />
      ) : (
        <DiscoveryScreen
          onOpenLeagueSheet={openLeagueSheet}
          onOpenDrawer={() => setDrawerOpen(true)}
        />
      )}
    </>
  );
}
