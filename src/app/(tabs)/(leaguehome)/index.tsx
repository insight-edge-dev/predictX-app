import { LeagueChrome } from '@/components/LeagueChrome';
import LeagueHomeScreen from '../(home)/LeagueHomeScreen';

// The per-league home tab — only visible once the user has picked a league.
// Switching sport/league here (via the sport pills) just updates context;
// no navigation needed since this screen re-renders for the new league.
export default function LeagueHomeTab() {
  return (
    <LeagueChrome>
      {({ openLeagueSheet, openDrawer }) => (
        <LeagueHomeScreen
          onOpenLeagueSheet={openLeagueSheet}
          onOpenDrawer={openDrawer}
        />
      )}
    </LeagueChrome>
  );
}
