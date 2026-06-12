import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LeagueSheet } from './LeagueSheet';
import { useLeague } from '@/contexts/LeagueContext';
import { colors, spacing, font, radius } from '@/constants/theme';

/**
 * Wraps a tab screen (Matches / PredictX) so that, until the user has
 * explicitly picked a league (e.g. from Discovery), they're prompted to
 * choose one instead of silently landing on the IPL by default.
 */
export function LeaguePickerGate({ children }: { children: React.ReactNode }) {
  const { hasSelectedLeague } = useLeague();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!hasSelectedLeague) setSheetOpen(true);
  }, [hasSelectedLeague]);

  if (hasSelectedLeague) return <>{children}</>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl }}>
      <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🏆</Text>
      <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }}>
        Choose a league
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', marginBottom: spacing.xl }}>
        Pick a league to view its fixtures, results and predictions.
      </Text>
      <Pressable
        onPress={() => setSheetOpen(true)}
        style={({ pressed }) => ({
          backgroundColor: colors.accent,
          paddingHorizontal: spacing.xl,
          paddingVertical: spacing.md,
          borderRadius: radius.lg,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '700' }}>Browse Leagues</Text>
      </Pressable>

      <LeagueSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
    </View>
  );
}
