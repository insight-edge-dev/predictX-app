/**
 * SeriesCard.tsx — bilateral international series card.
 *
 * Shown in the (international) section list. Mirrors MatchCard's visual
 * language (white card, subtle border, press-scale animation) but surfaces
 * series-level info: name, two-or-more team badges, format + match summary.
 */

import { View, Text, Pressable, Image, Animated } from 'react-native';
import { memo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getTeamColor } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import type { InternationalSeries } from '@/types/international';

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.984, useNativeDriver: true, speed: 50, bounciness: 3 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 3 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

function TeamBadge({ name, logo, size = 26 }: { name: string; logo: string; size?: number }) {
  const color = getTeamColor(name);
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.36, fontWeight: '700' }}>{(name || '?').slice(0, 2)}</Text>
    </View>
  );
}

const STATUS_META: Record<InternationalSeries['status'], { label: string; color: string }> = {
  live:      { label: 'LIVE',      color: colors.live    },
  upcoming:  { label: 'UPCOMING',  color: colors.warning },
  completed: { label: 'COMPLETED', color: colors.textMuted },
};

export const SeriesCard = memo(function SeriesCard({
  series,
  onPress,
}: {
  series:   InternationalSeries;
  onPress?: (id: string) => void;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const status = STATUS_META[series.status];
  const teams  = series.teams.slice(0, 4);

  const summary = series.completedCount > 0
    ? `${series.matchCount} ${series.format} · ${series.completedCount} completed`
    : `${series.matchCount} ${series.format}`;

  return (
    <Pressable onPress={() => onPress?.(series.id)} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={{
          transform: [{ scale }],
          marginBottom: spacing.sm,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
        }}
      >
        <View style={{
          backgroundColor: colors.card, borderRadius: radius.md,
          borderWidth: 1, borderColor: series.status === 'live' ? '#FECACA' : colors.border,
          overflow: 'hidden',
        }}>
          {series.status === 'live' && <View style={{ height: 2, backgroundColor: colors.live }} />}

          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
          }}>
            <Text
              style={{ flex: 1, color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}
              numberOfLines={1}
            >
              {series.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {series.status === 'live' && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />}
              <Text style={{ color: status.color, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
                {status.label}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* Teams */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
            gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
          }}>
            {teams.map((t, i) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {i > 0 && <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>vs</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TeamBadge name={t.shortName} logo={t.logo} />
                  <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>{t.shortName}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* Footer summary */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 1,
          }}>
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{summary}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
