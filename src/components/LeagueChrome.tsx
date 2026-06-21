import { useState, type ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { LeagueSheet, type SportTab } from '@/components/LeagueSheet';
import { SideDrawer } from '@/components/SideDrawer';
import type { League } from '@/contexts/LeagueContext';

/**
 * Owns the LeagueSheet + SideDrawer modal state shared by both the
 * Discovery tab and the per-league home tab, so each only needs to
 * render its own content via the render-prop API.
 */
interface Props {
  /** Called when a league is picked with no pending drawer route (e.g. via a sport pill). */
  onLeagueSelected?: (league: League) => void;
  children: (api: {
    openLeagueSheet: (sport?: SportTab) => void;
    openDrawer:      () => void;
  }) => ReactNode;
}

export function LeagueChrome({ onLeagueSelected, children }: Props) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen]     = useState(false);
  const [sheetSport, setSheetSport]   = useState<SportTab | undefined>(undefined);
  const [drawerOpen, setDrawerOpen]   = useState(false);
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

  function onSelectLeague(selected: League) {
    if (pendingRoute) {
      const route = pendingRoute;
      setPendingRoute(null);
      router.push(route as any);
      return;
    }
    onLeagueSelected?.(selected);
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
      {children({ openLeagueSheet, openDrawer: () => setDrawerOpen(true) })}
    </>
  );
}
