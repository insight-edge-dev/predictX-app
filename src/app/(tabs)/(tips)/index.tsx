import {
  View, Text, Pressable, FlatList, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTipsList } from '@/hooks/useTips';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { formatMatchDate } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';
import { PredictionCardSkeleton } from '@/components/Skeleton';
import type { MatchWithTip } from '@/services/tipsService';

// ── Team logo ─────────────────────────────────────────────────

function TeamLogo({ logo, short, size }: { logo: string; short: string; size: number }) {
  const url   = getTeamLogo(logo ?? '', short);
  const color = getTeamColor(short);
  if (url) {
    return (
      <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.38, fontWeight: '800' }}>{short}</Text>
    </View>
  );
}

// ── Confidence pill ───────────────────────────────────────────

function ConfidencePill({ label }: { label: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const color =
    label === 'HIGH'   ? colors.success :
    label === 'MEDIUM' ? '#F59E0B' :
                         colors.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
        {label} CONFIDENCE
      </Text>
    </View>
  );
}

// ── Match tip card ────────────────────────────────────────────

function MatchTipCard({ match, onPress }: { match: MatchWithTip; onPress: () => void }) {
  const t1  = match.team1;
  const t2  = match.team2;
  const c1  = getTeamColor(t1.shortName);
  const c2  = getTeamColor(t2.shortName);
  const tip = match.tip;

  const t1Pct  = tip?.team1Pct ?? 50;
  const t2Pct  = tip?.team2Pct ?? 50;
  const winner = tip?.winner;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, marginBottom: spacing.md })}
    >
      <View style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        backgroundColor: colors.card,
      }}>
        {/* ── Colored top accent bar ── */}
        <View style={{ height: 3, flexDirection: 'row' }}>
          <View style={{ flex: t1Pct, backgroundColor: c1 }} />
          <View style={{ flex: t2Pct, backgroundColor: c2 }} />
        </View>

        <View style={{ padding: spacing.lg }}>
          {/* ── Row 1: Status + Date ── */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            {match.status === 'live' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.live + '18', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.live + '35' }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.live }} />
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.8 }}>LIVE</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: colors.accent + '15', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.accent + '30' }}>
                <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.8 }}>UPCOMING</Text>
              </View>
            )}
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
              {formatMatchDate(match.date)}
            </Text>
          </View>

          {/* ── Row 2: Teams + Win % ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>

            {/* Team 1 */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <TeamLogo logo={t1.logo} short={t1.shortName} size={56} />
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', letterSpacing: 0.2 }}>
                {t1.shortName}
              </Text>
              <Text style={{
                fontSize: 24, fontWeight: '800', lineHeight: 26,
                color: winner === t1.shortName ? c1 : colors.textSecondary,
              }}>
                {t1Pct}%
              </Text>
            </View>

            {/* Centre divider */}
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, gap: 8 }}>
              <View style={{ width: 1, height: 18, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>VS</Text>
              <View style={{ width: 1, height: 18, backgroundColor: colors.border }} />
            </View>

            {/* Team 2 */}
            <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <TeamLogo logo={t2.logo} short={t2.shortName} size={56} />
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', letterSpacing: 0.2 }}>
                {t2.shortName}
              </Text>
              <Text style={{
                fontSize: 24, fontWeight: '800', lineHeight: 26,
                color: winner === t2.shortName ? c2 : colors.textSecondary,
              }}>
                {t2Pct}%
              </Text>
            </View>
          </View>

          {/* ── Row 3: Probability bar ── */}
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ height: 5, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ flex: t1Pct, backgroundColor: c1 }} />
              <View style={{ flex: t2Pct, backgroundColor: c2 + 'AA' }} />
            </View>
          </View>

          {/* ── Row 4: Confidence + Predicted winner ── */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: spacing.md,
            borderTopWidth: 1, borderTopColor: colors.border + '60',
          }}>
            <View>
              {tip ? (
                <ConfidencePill label={tip.confidenceLabel} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <ActivityIndicator size={10} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Analysing...</Text>
                </View>
              )}
              {match.venue ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 }}>
                  <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
                    {match.venue.split(',')[0]}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* CTA */}
            <Pressable onPress={onPress} style={{
              flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: colors.accent + '18',
              borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8,
              borderWidth: 1, borderColor: colors.accent + '35',
            }}>
              <Ionicons name="bar-chart-outline" size={13} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
                Analysis
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.xl,
      padding: spacing.xxxl, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl,
    }}>
      <View style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: colors.accent + '15',
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
      }}>
        <Ionicons name="flash-outline" size={28} color={colors.accent} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', marginBottom: spacing.sm }}>
        No Upcoming Matches
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: font.md, textAlign: 'center', lineHeight: 20 }}>
        Predictions appear when IPL matches are scheduled
      </Text>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ count }: { count: number }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>
        IPL 2026
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 }}>
        Predictions
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
        <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>
          7-factor AI predictions · {count} match{count !== 1 ? 'es' : ''}
        </Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function TipsScreen() {
  const router = useRouter();
  const { data: matches = [], isLoading, isFetching } = useTipsList();
  const showSkeleton = isLoading || (isFetching && matches.length === 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlatList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: 100,
          }}
          ListHeaderComponent={<SectionHeader count={showSkeleton ? 0 : matches.length} />}
          ListEmptyComponent={
            showSkeleton ? (
              <>
                <PredictionCardSkeleton />
                <PredictionCardSkeleton />
                <PredictionCardSkeleton />
              </>
            ) : (
              <EmptyState />
            )
          }
          renderItem={({ item }) => (
            <MatchTipCard
              match={item}
              onPress={() => router.push(`/(tip-detail)/${item.id}`)}
            />
          )}
        />
      </SafeAreaView>
    </View>
  );
}
