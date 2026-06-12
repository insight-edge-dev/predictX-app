import {
  View, Text, Pressable, Image, ActivityIndicator, ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTipsList } from '@/hooks/useTips';
import { useMatchCategories } from '@/hooks/useMatches';
import { useFootballTips } from '@/hooks/useFootballTips';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { getTeamColor as getWCColor, getTeamFlag } from '@/constants/wc2026Teams';
import { formatMatchDate } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';
import { useLeague, useIsFootball } from '@/contexts/LeagueContext';
import { PredictionCardSkeleton } from '@/components/Skeleton';
import { FootballProbabilityBar } from '@/components/FootballProbabilityBar';
import { TeamCrest } from '@/components/TeamCrest';
import { LeagueSwitcher } from '@/components/LeagueSwitcher';
import { LeaguePickerGate } from '@/components/LeaguePickerGate';
import type { MatchWithTip } from '@/services/tipsService';
import type { FootballMatchWithTip } from '@/types/football';

// ── Team logo ─────────────────────────────────────────────────

function TeamLogo({ logo, short, size }: { logo: string; short: string; size: number }) {
  const url   = getTeamLogo(logo ?? '', short);
  const color = getTeamColor(short);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.38, fontWeight: '800' }}>{short}</Text>
    </View>
  );
}

// ── Confidence badge ──────────────────────────────────────────

function ConfidenceBadge({ label }: { label: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const cfg = {
    HIGH:   { color: colors.success,  bg: colors.success  + '15', border: colors.success  + '30', icon: 'trending-up'   },
    MEDIUM: { color: '#F59E0B',       bg: '#F59E0B15',             border: '#F59E0B30',            icon: 'remove'        },
    LOW:    { color: colors.textMuted, bg: colors.cardElevated,    border: colors.border,          icon: 'trending-down' },
  }[label];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: cfg.border }}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={{ color: cfg.color, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Match prediction card ─────────────────────────────────────

function MatchTipCard({ match, onPress }: { match: MatchWithTip; onPress: () => void }) {
  const t1  = match.team1;
  const t2  = match.team2;
  const c1  = getTeamColor(t1.shortName);
  const c2  = getTeamColor(t2.shortName);
  const tip = match.tip;

  const t1Pct  = tip?.team1Pct ?? 50;
  const t2Pct  = tip?.team2Pct ?? 50;
  const winner = tip?.winner;
  const isLive = match.status === 'live';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: spacing.md })}
    >
      <View style={{
        borderRadius: radius.xl,
        overflow: 'hidden',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: isLive ? colors.live + '40' : colors.border,
      }}>
        {/* Top gradient bar */}
        <LinearGradient
          colors={[c1 + '90', c2 + '90']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />

        <View style={{ padding: spacing.lg }}>

          {/* Header row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            {isLive ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.live + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.live + '35' }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>LIVE</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.accent + '30' }}>
                <Ionicons name="time-outline" size={11} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>UPCOMING</Text>
              </View>
            )}
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{formatMatchDate(match.date)}</Text>
          </View>

          {/* Teams row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>

            {/* Team 1 */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: c1 + '12',
                borderWidth: 1.5, borderColor: winner === t1.shortName ? c1 + '80' : c1 + '30',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <TeamLogo logo={t1.logo} short={t1.shortName} size={44} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>
                {t1.shortName}
              </Text>
              <Text style={{
                fontSize: 28, fontWeight: '900', letterSpacing: -1,
                color: winner === t1.shortName ? c1 : colors.textSecondary,
              }}>
                {t1Pct}%
              </Text>
            </View>

            {/* Centre */}
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, gap: 6 }}>
              <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
              <View style={{
                backgroundColor: colors.cardElevated, borderRadius: 8,
                paddingHorizontal: 8, paddingVertical: 4,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>VS</Text>
              </View>
              <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
            </View>

            {/* Team 2 */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: c2 + '12',
                borderWidth: 1.5, borderColor: winner === t2.shortName ? c2 + '80' : c2 + '30',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <TeamLogo logo={t2.logo} short={t2.shortName} size={44} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>
                {t2.shortName}
              </Text>
              <Text style={{
                fontSize: 28, fontWeight: '900', letterSpacing: -1,
                color: winner === t2.shortName ? c2 : colors.textSecondary,
              }}>
                {t2Pct}%
              </Text>
            </View>
          </View>

          {/* Win probability bar */}
          <View style={{ marginBottom: spacing.md }}>
            <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', gap: 2 }}>
              <View style={{ flex: t1Pct, backgroundColor: c1, borderRadius: 3 }} />
              <View style={{ flex: t2Pct, backgroundColor: c2 + 'CC', borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={{ color: c1 + 'CC', fontSize: 10, fontWeight: '700' }}>{t1.shortName}</Text>
              <Text style={{ color: c2 + 'CC', fontSize: 10, fontWeight: '700' }}>{t2.shortName}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingTop: spacing.md,
            borderTopWidth: 1, borderTopColor: colors.border,
          }}>
            <View style={{ gap: 5 }}>
              {tip
                ? <ConfidenceBadge label={tip.confidenceLabel} />
                : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <ActivityIndicator size={10} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Analysing...</Text>
                  </View>
              }
              {match.venue ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
                    {match.venue.split(',')[0]}
                  </Text>
                </View>
              ) : null}
            </View>

            <Pressable onPress={onPress} style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.accent,
              borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
            })}>
              <Ionicons name="analytics" size={13} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: font.sm, fontWeight: '800' }}>
                Analysis
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Football tip card ─────────────────────────────────────────

function FootballTipCard({ match, onPress }: { match: FootballMatchWithTip; onPress: () => void }) {
  const tip  = match.tip;
  const hColor = getWCColor(match.homeTeam.shortName);
  const aColor = getWCColor(match.awayTeam.shortName);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: spacing.md })}
    >
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: match.status === 'live' ? colors.live + '40' : colors.border }}>
        <LinearGradient colors={[hColor + '90', aColor + '90']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: 3 }} />

        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.accent + '30' }}>
              <Text style={{ fontSize: 12 }}>⚽</Text>
              <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{match.stage}</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{formatMatchDate(match.date)}</Text>
          </View>

          {/* Teams */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: hColor + '12', borderWidth: 1.5, borderColor: hColor + '40', alignItems: 'center', justifyContent: 'center' }}>
                <TeamCrest logo={match.homeTeam.logo} flag={match.homeTeam.flag} size={44} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>{match.homeTeam.shortName}</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -1, color: tip?.winner === match.homeTeam.shortName ? hColor : colors.textSecondary }}>
                {tip?.homeWin ?? '–'}%
              </Text>
            </View>

            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, gap: 6 }}>
              <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
              <View style={{ backgroundColor: colors.cardElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>VS</Text>
              </View>
              <View style={{ width: 1, height: 20, backgroundColor: colors.border }} />
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: aColor + '12', borderWidth: 1.5, borderColor: aColor + '40', alignItems: 'center', justifyContent: 'center' }}>
                <TeamCrest logo={match.awayTeam.logo} flag={match.awayTeam.flag} size={44} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>{match.awayTeam.shortName}</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', letterSpacing: -1, color: tip?.winner === match.awayTeam.shortName ? aColor : colors.textSecondary }}>
                {tip?.awayWin ?? '–'}%
              </Text>
            </View>
          </View>

          {/* 3-way probability bar */}
          {tip && (
            <View style={{ marginBottom: spacing.md }}>
              <FootballProbabilityBar
                homeTeam={match.homeTeam.shortName}
                awayTeam={match.awayTeam.shortName}
                homeWin={tip.homeWin}
                draw={tip.draw}
                awayWin={tip.awayWin}
                isKnockout={tip.isKnockout}
              />
            </View>
          )}

          {/* Footer */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
            {tip ? (
              <ConfidenceBadge label={tip.confidenceLabel} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <ActivityIndicator size={10} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Analysing...</Text>
              </View>
            )}
            <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 })}>
              <Ionicons name="analytics" size={13} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: font.sm, fontWeight: '800' }}>Analysis</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Empty state ───────────────────────────────────────────────

function EmptyState() {
  const { league } = useLeague();
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.xl,
      padding: spacing.xxxl, alignItems: 'center',
      borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl,
    }}>
      <View style={{
        width: 72, height: 72, borderRadius: 22,
        backgroundColor: colors.accent + '12',
        borderWidth: 1, borderColor: colors.accent + '25',
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
      }}>
        <Ionicons name="analytics" size={32} color={colors.accent} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.sm, letterSpacing: -0.3 }}>
        No Matches Yet
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 20 }}>
        PredictX predictions appear when {league.short} matches are scheduled
      </Text>
    </View>
  );
}

// ── Header ────────────────────────────────────────────────────

function Header({ count }: { count: number }) {
  const { league } = useLeague();
  const isIPL = league.id === 'ipl';
  return (
    <View style={{ marginBottom: spacing.xl, paddingTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2 }}>{league.short} {league.season}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
          PredictX
        </Text>
        <LeagueSwitcher />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: colors.success + '15', borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 4,
          borderWidth: 1, borderColor: colors.success + '30',
        }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success }} />
          <Text style={{ color: colors.success, fontSize: font.xs, fontWeight: '700' }}>
            {isIPL ? '7-factor AI model' : 'Live data model'}
          </Text>
        </View>
        {count > 0 && (
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
            {count} match{count !== 1 ? 'es' : ''} analysed
          </Text>
        )}
      </View>
    </View>
  );
}

// ── League badge helper ───────────────────────────────────────

function LeagueBadge({ size = 88 }: { size?: number }) {
  const { league } = useLeague();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
    }}>
      {league.image
        ? <Image source={{ uri: league.image }} style={{ width: size * 0.7, height: size * 0.7 }} resizeMode="contain" />
        : <Text style={{ fontSize: size * 0.45 }}>{league.flag}</Text>
      }
    </View>
  );
}

// ── Season ended state ────────────────────────────────────────

function SeasonEndedState() {
  const { league, setLeagueId } = useLeague();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl, paddingBottom: 60 }}>
      <LeagueBadge />

      {/* Badge */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: colors.textMuted + '18', borderRadius: 20,
        paddingHorizontal: 14, paddingVertical: 6,
        borderWidth: 1, borderColor: colors.border,
        marginBottom: spacing.lg,
      }}>
        <Ionicons name="trophy-outline" size={13} color={colors.textMuted} />
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>
          SEASON ENDED
        </Text>
      </View>

      <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '900', textAlign: 'center', marginBottom: spacing.sm, letterSpacing: -0.3 }}>
        {league.short} {league.season} Complete
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xxxl }}>
        The {league.name} season has ended.{'\n'}
        PredictX predictions will be available when the next season begins.
      </Text>

      <Pressable
        onPress={() => setLeagueId('ipl')}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          backgroundColor: colors.accent, borderRadius: radius.md,
          paddingHorizontal: spacing.xxl, paddingVertical: spacing.md + 2,
          flexDirection: 'row', alignItems: 'center', gap: 8,
        })}
      >
        <Text style={{ color: '#FFFFFF', fontSize: font.base, fontWeight: '800' }}>View IPL Predictions</Text>
        <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

// ── Football tips screen ──────────────────────────────────────

function FootballTipsScreen() {
  const router = useRouter();
  const { data: footballMatches = [], isLoading: fbLoading, isFetching: fbFetching } = useFootballTips();
  const showFbSkeleton = fbLoading || (fbFetching && footballMatches.length === 0);

  return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <FlashList
            data={footballMatches}
            keyExtractor={(m) => String(m.id)}
            estimatedItemSize={180}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.xl, paddingTop: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2 }}>⚽ FIFA WORLD CUP 2026</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
                    PredictX
                  </Text>
                  <LeagueSwitcher />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success + '15', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.success + '30' }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success }} />
                    <Text style={{ color: colors.success, fontSize: font.xs, fontWeight: '700' }}>6-factor model</Text>
                  </View>
                  {footballMatches.length > 0 && (
                    <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{footballMatches.length} matches analysed</Text>
                  )}
                </View>
              </View>
            }
            ListEmptyComponent={
              showFbSkeleton ? (
                <><PredictionCardSkeleton /><PredictionCardSkeleton /><PredictionCardSkeleton /></>
              ) : (
                <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.xxxl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl }}>
                  <Text style={{ fontSize: 40, marginBottom: spacing.lg }}>⚽</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.sm }}>No Matches Yet</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 20 }}>
                    PredictX predictions appear when World Cup matches are scheduled
                  </Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <FootballTipCard
                match={item}
                onPress={() => router.push(`/(tip-detail)/${item.id}?sport=football` as any)}
              />
            )}
          />
        </SafeAreaView>
      </View>
  );
}

// ── Cricket tips screen ───────────────────────────────────────

function CricketTipsScreen() {
  const router     = useRouter();
  const { league } = useLeague();
  const isIPL      = league.id === 'ipl';

  const { liveMatches, upcomingMatches, completedMatches, isLoading: matchLoading } = useMatchCategories();
  const seasonEnded = !isIPL && !matchLoading
    && liveMatches.length === 0
    && upcomingMatches.length === 0
    && completedMatches.length > 0;

  const { data: matches = [], isLoading, isFetching } = useTipsList();
  const showSkeleton = isLoading || (isFetching && matches.length === 0);

  if (seasonEnded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>
              {league.short} {league.season}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
                PredictX
              </Text>
              <LeagueSwitcher />
            </View>
          </View>
          <SeasonEndedState />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <FlashList
          data={matches}
          keyExtractor={(m) => String(m.id)}
          estimatedItemSize={180}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
          ListHeaderComponent={<Header count={showSkeleton ? 0 : matches.length} />}
          ListEmptyComponent={
            showSkeleton ? (
              <><PredictionCardSkeleton /><PredictionCardSkeleton /><PredictionCardSkeleton /></>
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

// ── Main screen ───────────────────────────────────────────────

export default function TipsScreen() {
  const isFootball = useIsFootball();
  return (
    <LeaguePickerGate>
      {isFootball ? <FootballTipsScreen /> : <CricketTipsScreen />}
    </LeaguePickerGate>
  );
}
