/**
 * SeriesCard.tsx — bilateral international series card.
 *
 * Face-off layout for 2-team series, badge row for 3+ team events.
 * Live series get a red accent bar + pulsing dot indicator.
 */

import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { getTeamColor } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import type { InternationalSeries } from '@/types/international';
import { usePress } from '@/hooks/usePress';


function TeamBadge({ name, logo, size = 40 }: { name: string; logo: string; size?: number }) {
  const color = getTeamColor(name);
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: size, height: size }} contentFit="contain" />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.34, fontWeight: '700' }}>{(name || '?').slice(0, 2)}</Text>
    </View>
  );
}

function SmallTeamBadge({ name, logo }: { name: string; logo: string }) {
  const color = getTeamColor(name);
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: 24, height: 24 }} contentFit="contain" />;
  }
  return (
    <View style={{
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: 9, fontWeight: '700' }}>{(name || '?').slice(0, 2)}</Text>
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
  const press = usePress(0.984);
  const status = STATUS_META[series.status];
  const teams  = series.teams.slice(0, 4);
  const isLive = series.status === 'live';

  const remaining = series.matchCount - series.completedCount;
  const progressText = series.completedCount > 0
    ? remaining > 0
      ? `${series.completedCount}/${series.matchCount} played`
      : `${series.matchCount} ${series.format} · Completed`
    : `${series.matchCount} ${series.format}`;

  return (
    <Pressable onPress={() => onPress?.(series.id)} onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
      <Animated.View
        style={[{
          marginBottom: spacing.sm,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
        }, press.style]}
      >
        <View style={{
          backgroundColor: colors.card, borderRadius: radius.lg,
          borderWidth: 1, borderColor: isLive ? '#FCA5A5' : colors.border,
          overflow: 'hidden',
        }}>
          {/* Live accent bar */}
          {isLive && <View style={{ height: 2.5, backgroundColor: colors.live }} />}

          {/* Header: series name + status */}
          <View style={{
            flexDirection: 'row', alignItems: 'flex-start',
            paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
          }}>
            <Text
              style={{
                flex: 1, color: colors.textPrimary, fontSize: font.sm,
                fontWeight: '700', lineHeight: 18, marginRight: spacing.sm,
              }}
              numberOfLines={2}
            >
              {series.name}
            </Text>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: isLive ? colors.liveDim : series.status === 'upcoming' ? colors.warningDim : colors.cardElevated,
              borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3,
              borderWidth: 1, borderColor: isLive ? '#FCA5A5' : series.status === 'upcoming' ? '#FCD34D' : colors.border,
            }}>
              {isLive && (
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.live }} />
              )}
              <Text style={{ color: status.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                {status.label}
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* Teams section */}
          {teams.length === 2 ? (
            /* Face-off layout for bilateral series */
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
            }}>
              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <TeamBadge name={teams[0].shortName} logo={teams[0].logo} size={38} />
                <Text style={{
                  color: colors.textPrimary, fontSize: font.xs, fontWeight: '700',
                  textAlign: 'center',
                }} numberOfLines={1}>
                  {teams[0].shortName}
                </Text>
              </View>

              <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg }}>
                <Text style={{
                  color: colors.textMuted, fontSize: font.xs, fontWeight: '800', letterSpacing: 1.5,
                }}>
                  vs
                </Text>
              </View>

              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <TeamBadge name={teams[1].shortName} logo={teams[1].logo} size={38} />
                <Text style={{
                  color: colors.textPrimary, fontSize: font.xs, fontWeight: '700',
                  textAlign: 'center',
                }} numberOfLines={1}>
                  {teams[1].shortName}
                </Text>
              </View>
            </View>
          ) : (
            /* Badge row for multi-team series */
            <View style={{
              flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
              gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
            }}>
              {teams.map((t, i) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  {i > 0 && <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>vs</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <SmallTeamBadge name={t.shortName} logo={t.logo} />
                    <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>{t.shortName}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* Footer */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                backgroundColor: colors.accentDim, borderRadius: radius.sm,
                paddingHorizontal: 7, paddingVertical: 2,
              }}>
                <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>{series.format}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{progressText}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
