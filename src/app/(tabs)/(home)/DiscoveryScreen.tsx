import { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLeague } from '@/contexts/LeagueContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useHomeBundle } from '@/hooks/useHomeBundle';
import { useWCHistoryStats } from '@/hooks/useWCHistoryStats';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useWC2026Groups } from '@/hooks/useWC2026Groups';
import { useHomeNews, useHomeRankings, useHomeFacts, useHomeSections, useAccuracy, useLeagueCards } from '@/hooks/useHome';
import { useInternationalSeries, useInternationalSchedule } from '@/hooks/useInternational';
import type { RecentPrediction } from '@/hooks/useHome';
import { useLeaderboard } from '@/hooks/useUserPrediction';
import type { LeaderboardEntry } from '@/hooks/useUserPrediction';
import { PageLoader } from '@/components/PageLoader';
import { Bone } from '@/components/Skeleton';
import { useTipsList } from '@/hooks/useTips';
import { useLeagueTable } from '@/hooks/useMatches';
import type { SportTab } from '@/components/LeagueSheet';
import { GroupTable } from '@/components/GroupTable';
import { BannerCarousel } from '@/components/BannerCarousel';
import { SeriesCard } from '@/components/SeriesCard';
import { QuickPredictSection } from '@/components/home/QuickPredictSection';
import { colors, spacing, font, radius } from '@/constants/theme';
import {
  C_CRICKET, C_FOOTBALL, C_LIVE,
  isToday, greeting, fmtDate,
  SectionHeader, LiveSectionHeader, EmptyCard, SportPill,
  CricketMatchCard, FootballMatchCard, NewsCard, AIPickCard, CricketPickCard,
  MiniStandingsTable, WCCountdownBanner,
  WC_FACTS, CRICKET_FACTS, fbFlag, WCStatCard, FactCard, RankingTeamCard, RankingPlayerCard,
  AccuracyBadge, LeagueTrackRecordCard,
  MatchGroupHeader, CompactCricketRow, CompactFootballRow,
  type StatCard,
} from '@/components/home/HomeShared';

// Falls back to this order when /home/sections has no rows yet (or fails) —
// matches the order these sections were seeded in admin's home_sections table.
const DEFAULT_SECTION_ORDER = [
  'points_table', 'icc_rankings', 'wc_history', 'did_you_know', 'wc_groups', 'latest_news', 'leagues_explore',
];

// ── League Explore Card ───────────────────────────────────────

function LeagueCard({ emoji, title, subtitle, color, onPress }: {
  emoji: string; title: string; subtitle: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        flex: 1, backgroundColor: colors.card,
        borderRadius: radius.xl, borderWidth: 1, borderColor: color + '40',
        padding: spacing.md + 2, overflow: 'hidden',
      })}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 26, marginBottom: 6, marginTop: 4 }}>{emoji}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 3 }}>{subtitle}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: spacing.sm }}>
        <Text style={{ color, fontSize: 10, fontWeight: '700' }}>Explore</Text>
        <Ionicons name="arrow-forward-outline" size={10} color={color} />
      </View>
    </Pressable>
  );
}

// ── Top Predictors Card ───────────────────────────────────────

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const medal    = entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : null;
  const maxScore = 20;
  const barPct   = Math.min(((entry.score ?? 0) / maxScore) * 100, 100);

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 9,
      borderBottomWidth: 1, borderBottomColor: colors.border,
    }}>
      <View style={{ width: 30, alignItems: 'center' }}>
        {medal
          ? <Text style={{ fontSize: 16 }}>{medal}</Text>
          : <Text style={{ fontSize: font.sm, fontWeight: '700', color: colors.textMuted }}>#{entry.rank}</Text>
        }
      </View>

      <View style={{ flex: 1, marginLeft: spacing.xs }}>
        <Text style={{ fontSize: font.sm, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
          {entry.display_name}
        </Text>
        <View style={{
          height: 4, borderRadius: 2, backgroundColor: colors.cardElevated,
          marginTop: 4, overflow: 'hidden',
        }}>
          <View style={{
            height: 4, borderRadius: 2, backgroundColor: colors.accent,
            width: `${barPct}%`,
          }} />
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', marginLeft: spacing.sm }}>
        <Text style={{ fontSize: font.sm, fontWeight: '800', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>
          {(entry.score ?? 0).toFixed(1)}
        </Text>
        <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', marginTop: 1 }}>
          score
        </Text>
      </View>
    </View>
  );
}

function TopPredictorsSection() {
  const { data: entries = [], isLoading } = useLeaderboard(5, 'week');

  if (isLoading) return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.xl,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <Ionicons name="trophy" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
        <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>Top Predictors This Week</Text>
      </View>
      {[1, 2, 3].map(i => (
        <View key={i} style={{
          height: 36, borderRadius: radius.md,
          backgroundColor: colors.cardElevated,
          marginBottom: spacing.sm,
        }} />
      ))}
    </View>
  );

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm,
      marginBottom: spacing.xl,
    }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="trophy" size={16} color="#F59E0B" />
          <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>Top Predictors This Week</Text>
        </View>
        <View style={{
          backgroundColor: colors.accentDim, paddingHorizontal: 8,
          paddingVertical: 3, borderRadius: 20,
        }}>
          <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}>LIVE</Text>
        </View>
      </View>

      {/* Column labels */}
      <View style={{ flexDirection: 'row', paddingVertical: 4, marginBottom: 2 }}>
        <View style={{ width: 30 }} />
        <Text style={{ flex: 1, marginLeft: spacing.xs, fontSize: 10, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.3 }}>PREDICTOR</Text>
        <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.3 }}>CORRECT · ACC</Text>
      </View>

      {entries.length === 0 ? (
        <View style={{ paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.xs }}>
          <Ionicons name="podium-outline" size={28} color={colors.border} />
          <Text style={{ fontSize: font.sm, fontWeight: '600', color: colors.textSecondary, marginTop: spacing.xs }}>
            No predictions resolved yet
          </Text>
          <Text style={{ fontSize: font.xs, color: colors.textMuted }}>
            Predict match outcomes to appear here
          </Text>
        </View>
      ) : (
        entries.map(e => <LeaderboardRow key={e.user_id} entry={e} />)
      )}

      {entries.length > 0 && (
        <Text style={{ fontSize: 10, color: colors.textMuted, textAlign: 'center', paddingTop: spacing.sm }}>
          Ranked by correct predictions in the last 7 days
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

interface Props {
  onOpenLeagueSheet: (sport?: SportTab) => void;
  onOpenDrawer:      () => void;
}

export default function DiscoveryScreen({ onOpenLeagueSheet, onOpenDrawer }: Props) {
  const router          = useRouter();
  const { league, setLeagueId } = useLeague();
  const { unreadCount } = useNotificationBadge();

  // Bundle fires ONE request for all expensive data — eliminates 15+ parallel
  // HTTP/1.1 calls that queued behind the 6-connection limit on mobile.
  const bundle = useHomeBundle();
  const bundleResolved = bundle.isSuccess || bundle.isError;

  // Individual hooks are disabled until bundle resolves.
  // When bundle sets their cache keys, they read from cache without fetching.
  const { cricket, football, isLoading, isRefetching, refetch } = useHomeFeed({ enabled: bundleResolved });
  const { data: wcStats }    = useWCHistoryStats();
  const { data: tips = [] }  = useFootballTips();
  const { data: groups }     = useWC2026Groups();
  const { data: news = [] }  = useHomeNews(bundleResolved);
  const { data: cricketTips = [] } = useTipsList();
  const { data: apiFacts = [] }    = useHomeFacts(league.sport);
  const { data: standings = [] }   = useLeagueTable();
  const { data: rankings }         = useHomeRankings();
  const { data: homeSections = [] } = useHomeSections();
  const { data: accuracy }          = useAccuracy();
  const { data: leagueCards = [], isFetching: leagueCardsFetching, refetch: refetchLeagueCards } = useLeagueCards(5, bundleResolved);
  const { data: allSeries = [] } = useInternationalSeries({ enabled: bundleResolved });
  const { data: intlSchedule }   = useInternationalSchedule({ enabled: bundleResolved });

  // Partition by today / upcoming
  const cLive      = cricket.live;
  const fLive      = football.live;
  const cToday     = cricket.upcoming.filter(m => isToday(m.date));
  const fToday     = football.upcoming.filter(m => isToday(m.date));
  const intlLive     = intlSchedule?.live     ?? [];
  const intlToday    = intlSchedule?.today    ?? [];
  const intlUpcoming = (intlSchedule?.upcoming ?? []).slice(0, 3);
  const cUpcoming  = cricket.upcoming.filter(m => !isToday(m.date)).slice(0, 6);
  const fUpcoming  = football.upcoming.filter(m => !isToday(m.date)).slice(0, 5);

  // Group cricket by league for the Coming Up section
  const cUpcomingByLeague = useMemo(() => {
    const groups: Record<string, typeof cUpcoming> = {};
    cUpcoming.forEach(m => {
      const key = m.leagueLabel || 'Cricket';
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups); // [['T20 Blast W', [...]], ...]
  }, [cUpcoming]);
  const totalLive  = cLive.length + fLive.length + intlLive.length;
  // Live matches already render in the "Live Now" section above — don't count
  // them here too, or this section shows an empty header with no fallback
  // message when the only thing happening today is already-live.
  const hasToday   = cToday.length + fToday.length + intlToday.length > 0;
  const hasUpcoming = cUpcoming.length + fUpcoming.length + intlUpcoming.length > 0;
  const wcPreTournament = Date.now() < new Date('2026-06-11T00:00:00Z').getTime();
  const wcNotStarted = wcPreTournament && fLive.length === 0 && football.upcoming.length === 0;

  const [showAllLeagueCards, setShowAllLeagueCards] = useState(false);
  const LEAGUE_CARD_LIMIT = 6;
  // Backend returns cards in admin-controlled display_order — no client-side sort needed.
  const sortedLeagueCards = useMemo(
    () => leagueCards.filter(card => (card.accuracy?.sampleSize ?? 0) > 0 || card.accuracy?.isOverridden),
    [leagueCards],
  );

  // WC Stat Cards derived from historical data
  const statCards: StatCard[] = wcStats ? [
    {
      icon: fbFlag(wcStats.legends[0]?.code ?? 'BRA'),
      stat: `${wcStats.legends[0]?.titles ?? 5} 🏆`,
      title: wcStats.legends[0]?.name ?? 'Brazil',
      desc: `${wcStats.legends[0]?.wcWinRate ?? 71}% WC win rate · ${wcStats.legends[0]?.appearances ?? 22} tournaments`,
      color: '#F59E0B',
    },
    {
      icon: '⚡',
      stat: `${wcStats.penaltyBest[0]?.penaltyWinRate ?? 100}%`,
      title: `${wcStats.penaltyBest[0]?.code ?? 'GER'} — Penalty Kings`,
      desc: `${fbFlag(wcStats.penaltyBest[0]?.code ?? 'GER')} ${wcStats.penaltyBest[0]?.penaltyMatches ?? 4} shootouts, unbeaten`,
      color: '#10B981',
    },
    {
      icon: '🏠',
      stat: `${wcStats.hostWinRate ?? 58}%`,
      title: 'Host Advantage',
      desc: 'Win rate for World Cup host nations across all 22 editions',
      color: '#6366F1',
    },
    {
      icon: '😰',
      stat: `${wcStats.penaltyWorst[0]?.penaltyWinRate ?? 0}%`,
      title: `${wcStats.penaltyWorst[0]?.code ?? 'MEX'} — Penalty Curse`,
      desc: `${fbFlag(wcStats.penaltyWorst[0]?.code ?? 'MEX')} ${wcStats.penaltyWorst[0]?.penaltyMatches ?? 3} shootouts, 0 wins`,
      color: '#EF4444',
    },
    {
      icon: '⚔️',
      stat: `${wcStats.rivalries[0]?.total ?? 2} WC meetings`,
      title: `${wcStats.rivalries[0]?.teamA.code ?? 'BRA'} vs ${wcStats.rivalries[0]?.teamB.code ?? 'ARG'}`,
      desc: `${wcStats.rivalries[0]?.aWins ?? 1}W – ${wcStats.rivalries[0]?.draws ?? 0}D – ${wcStats.rivalries[0]?.bWins ?? 1}W · Classic rivalry`,
      color: '#8B5CF6',
    },
    {
      icon: fbFlag(wcStats.legends[2]?.code ?? 'ITA'),
      stat: `${wcStats.legends[2]?.titles ?? 4} 🏆`,
      title: wcStats.legends[2]?.name ?? 'Italy',
      desc: `${wcStats.legends[2]?.wcWinRate ?? 50}% WC win rate${wcStats.legends[2]?.wcKnockoutWinRate ? ` · ${wcStats.legends[2].wcKnockoutWinRate}% KO rate` : ''}`,
      color: '#3B82F6',
    },
  ] : [];

  // Pick 2 rotating facts by day, sport-aware. Admin-managed facts (apiFacts)
  // take priority; fall back to the bundled defaults until an admin adds any.
  const factsSource = apiFacts.length > 0
    ? apiFacts
    : (league.sport === 'cricket' ? CRICKET_FACTS : WC_FACTS);
  const factStart = new Date().getDate() % factsSource.length;
  const todayFacts = [factsSource[factStart], factsSource[(factStart + 1) % factsSource.length]];

  // Top 2 football tips for upcoming matches
  const upcomingTips = tips.filter(t => t.status === 'upcoming' && t.tip).slice(0, 2);

  // Top 2 cricket tips for upcoming matches (active league)
  const upcomingCricketTips = cricketTips.filter(t => t.status === 'upcoming' && t.tip).slice(0, 2);

  // ICC T20I team rankings (top 5) + top-ranked batsman/bowler
  const rankingTeams = rankings?.rankings?.t20i_men?.slice(0, 5) ?? [];
  const topBatsman = rankings?.batsmen?.[0] ?? null;
  const topBowler  = rankings?.bowlers?.[0] ?? null;

  // Group standings preview (first 2)
  const groupPairs = groups
    ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).slice(0, 2)
    : [];

  // Top 3 news items
  const topNews = news.slice(0, 3);

  // Live + upcoming international series, max 3 shown on Discovery
  const activeSeries = allSeries.filter(s => s.status !== 'completed').slice(0, 3);

  // Discretionary section order/visibility, admin-configured; fall back to
  // the bundled default order until home_sections has been seeded/fetched.
  const sectionOrder = homeSections.length > 0
    ? homeSections.filter(s => s.enabled).sort((a, b) => a.display_order - b.display_order).map(s => s.key)
    : DEFAULT_SECTION_ORDER;

  // Show full-screen Lottie loader only on cold first paint — when no cached
  // content is available yet. Once any match data is in React Query cache this
  // stays false, so pull-to-refresh never triggers the overlay.
  const noContent = cLive.length === 0 && cToday.length === 0 && cUpcoming.length === 0
                 && fLive.length === 0 && intlLive.length === 0 && intlToday.length === 0;
  // Show loader while bundle is pending AND we have no cached content to show
  const showPageLoader = bundle.isLoading && noContent;

  const showLeagueCardsSkeleton = leagueCardsFetching && leagueCards.length === 0;

  function goToCricket()  { setLeagueId('ipl');    router.push('/(tabs)/(matches)'); }
  function goToFootball() { setLeagueId('wc2026'); router.push('/(tabs)/(matches)'); }
  function goToIntlSeries(stageId: string) { router.push(`/(international)/${stageId}` as any); }
  function goToTips()     { router.push('/(tabs)/(tips)'); }
  function goToMatches()  { setLeagueId(league.id); router.push('/(tabs)/(matches)'); }
  function goToTip(id: string) { router.push(`/(tip-detail)/${id}` as any); }
  function goToRecentPrediction(p: RecentPrediction) {
    if (p.sport === 'football') {
      router.push(`/(match-details)/${p.id}?sport=football` as any);
    } else {
      if (league.sport !== 'cricket') setLeagueId('ipl');
      router.push(`/(match-details)/${p.id}` as any);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <PageLoader show={showPageLoader} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching || bundle.isFetching}
              onRefresh={() => { bundle.refetch(); refetch(); refetchLeagueCards(); }}
              tintColor={C_CRICKET}
              colors={[C_CRICKET, C_FOOTBALL]}
            />
          }
        >
          {/* ── Header ─────────────────────────────── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: spacing.sm, marginBottom: spacing.lg,
          }}>
            {/* Logomark + Wordmark */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Image
                source={require('../../../../assets/icon.png')}
                style={{ width: 38, height: 38, borderRadius: 10 }}
                resizeMode="cover"
              />
              <Text style={{ color: colors.textPrimary, fontSize: 26, fontFamily: 'Geist_800ExtraBold', letterSpacing: -0.5 }}>PredictX</Text>
            </View>
            {/* Actions */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {accuracy && (
                <AccuracyBadge percentage={accuracy.percentage} sampleSize={accuracy.sampleSize} />
              )}
              <Pressable
                onPress={() => router.push('/(settings)/notifications' as any)}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' })}>
                <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: C_LIVE }} />
                )}
              </Pressable>
              <Pressable
                onPress={onOpenDrawer}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' })}>
                <Ionicons name="menu-outline" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* ── Sport pills ────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xl }}>
            <SportPill emoji="🏏" label="Cricket"  color={C_CRICKET}  textColor="#101400" active={false} onPress={() => onOpenLeagueSheet('cricket')}  />
            <SportPill emoji="⚽" label="Football" color={C_FOOTBALL} textColor="#FFFFFF" active={false} onPress={() => onOpenLeagueSheet('football')} />
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => onOpenLeagueSheet()}
              style={({ pressed }) => ({
                opacity: pressed ? 0.8 : 1,
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: colors.card,
                borderRadius: 20, borderWidth: 1, borderColor: colors.border,
                paddingHorizontal: 10, paddingVertical: 6,
              })}>
              <Ionicons name="layers-outline" size={12} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: font.xs }}>All Leagues</Text>
            </Pressable>
          </View>

          {/* ── Banners ────────────────────────────── */}
          <BannerCarousel placement="discovery" />

          {/* ── PredictX Prediction (per-league track record) ────── */}
          {showLeagueCardsSkeleton ? (
            <View style={{
              marginBottom: spacing.xl, backgroundColor: colors.card, borderRadius: radius.xl,
              borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg, gap: 8 }}>
                <Bone w={18} h={18} br={9} />
                <Bone w={160} h={16} br={6} />
              </View>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Bone w={28} h={28} br={14} />
                    <Bone w={100} h={13} br={5} />
                    <View style={{ flex: 1 }} />
                    <Bone w={50} h={13} br={5} />
                  </View>
                  <Bone w="100%" h={2} br={1} />
                </View>
              ))}
            </View>
          ) : leagueCards.length > 0 && (
            <View style={{
              marginBottom: spacing.xl, backgroundColor: colors.bg, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Ionicons name="trending-up" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>PredictX Prediction</Text>
              </View>
              {sortedLeagueCards
                .slice(0, showAllLeagueCards ? sortedLeagueCards.length : LEAGUE_CARD_LIMIT)
                .map((card, i) => (
                  <LeagueTrackRecordCard key={card.slug} card={card} index={i} defaultExpanded={true} onPressMatch={goToRecentPrediction} />
                ))}
              {sortedLeagueCards.length > LEAGUE_CARD_LIMIT && (
                <Pressable
                  onPress={() => setShowAllLeagueCards(prev => !prev)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: spacing.md,
                    marginTop: spacing.xs,
                    backgroundColor: colors.cardElevated,
                    borderRadius: radius.lg,
                  })}
                >
                  <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
                    {showAllLeagueCards ? 'Show less' : `See ${sortedLeagueCards.length - LEAGUE_CARD_LIMIT} more`}
                  </Text>
                  <Ionicons
                    name={showAllLeagueCards ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.accent}
                  />
                </Pressable>
              )}
              <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: spacing.xs }}>
                Powered by PredictX AI
              </Text>
            </View>
          )}

          {/* ── Live Now ───────────────────────────── */}
          {totalLive > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <LiveSectionHeader count={totalLive} />
              {cLive.map(m => <CricketMatchCard  key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}` as any)} leagueLabel={m.leagueLabel} />)}
              {fLive.map(m => <FootballMatchCard key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}?sport=football` as any)} />)}
              {intlLive.map(m => (
                <CricketMatchCard
                  key={m.id}
                  match={m}
                  onPress={() => goToIntlSeries(m.stageId)}
                  leagueLabel={m.leagueLabel}
                />
              ))}
            </View>
          )}

          {/* ── Today ──────────────────────────────── */}
          <View style={{ marginBottom: spacing.xl }}>
            <SectionHeader title="Today" />
            {wcNotStarted && <WCCountdownBanner onPress={goToFootball} />}
            {!hasToday && !wcNotStarted && !isLoading && (
              <EmptyCard message="No matches scheduled today — check Coming Up for what's next" />
            )}
            {cToday.map(m => <CricketMatchCard key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}` as any)} leagueLabel={m.leagueLabel} />)}
            {fToday.map(m => <FootballMatchCard key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}?sport=football` as any)} />)}
            {intlToday.map(m => (
              <CricketMatchCard
                key={m.id} match={m}
                onPress={() => goToIntlSeries(m.stageId)}
                leagueLabel={m.leagueLabel}
              />
            ))}
          </View>

          {/* ── Predict Now ────────────────────────── */}
          <QuickPredictSection
            cricket={cricket.upcoming}
            football={football.upcoming}
            international={intlSchedule?.upcoming ?? []}
            onPressMatch={(id, sport, stageId) => {
              if (sport === 'football') {
                router.push(`/(match-details)/${id}?sport=football` as any);
              } else if (sport === 'international' && stageId) {
                router.push(`/(international)/${stageId}` as any);
              } else {
                router.push(`/(match-details)/${id}` as any);
              }
            }}
            onSeeAll={() => router.push('/(predict)' as any)}
          />

          {/* ── Coming Up ──────────────────────────── */}
          {hasUpcoming && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="Coming Up" onMore={() => router.push('/(tabs)/(matches)')} moreLabel="See all →" />

              {/* Cricket — grouped by league */}
              {cUpcomingByLeague.map(([label, matches], groupIdx) => (
                <View key={label} style={{ marginBottom: groupIdx < cUpcomingByLeague.length - 1 || fUpcoming.length > 0 || intlUpcoming.length > 0 ? spacing.md : 0 }}>
                  <MatchGroupHeader label={label} sport="cricket" />
                  {matches.map(m => (
                    <CompactCricketRow key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}` as any)} />
                  ))}
                </View>
              ))}

              {/* Football */}
              {fUpcoming.length > 0 && (
                <View style={{ marginBottom: intlUpcoming.length > 0 ? spacing.md : 0 }}>
                  <MatchGroupHeader label="FIFA World Cup 2026" sport="football" />
                  {fUpcoming.map(m => (
                    <CompactFootballRow key={m.id} match={m} onPress={() => router.push(`/(match-details)/${m.id}?sport=football` as any)} />
                  ))}
                </View>
              )}

              {/* International bilateral */}
              {intlUpcoming.length > 0 && (
                <View>
                  <MatchGroupHeader label="International" sport="international" />
                  {intlUpcoming.map(m => (
                    <CompactCricketRow key={m.id} match={m} onPress={() => goToIntlSeries(m.stageId)} />
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── International Series ───────────────── */}
          {activeSeries.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader
                emoji="🌍"
                title="International Series"
                onMore={() => router.push('/(international)' as any)}
                moreLabel="View All →"
              />
              {activeSeries.map(s => (
                <SeriesCard
                  key={s.id}
                  series={s}
                  onPress={() => router.push(`/(international)/${s.id}` as any)}
                />
              ))}
            </View>
          )}


          {/* ── Top Predictors This Week ───────────── */}
          <TopPredictorsSection />

          {/* ── Discretionary sections, order/visibility from admin ── */}
          {sectionOrder.map(key => {
            switch (key) {
              case 'points_table':
                return null;

              case 'icc_rankings':
                return league.sport === 'cricket' && rankingTeams.length > 0 && (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader
                      emoji="🏆"
                      title="ICC T20I Rankings"
                      onMore={() => router.push('/(tabs)/(matches)/rankings' as any)}
                      moreLabel="Full rankings →"
                    />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.sm }}
                      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
                    >
                      {rankingTeams.map(t => <RankingTeamCard key={t.id || `${t.rank}-${t.code}`} team={t} />)}
                    </ScrollView>
                    {(topBatsman || topBowler) && (
                      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                        {topBatsman && <RankingPlayerCard player={topBatsman} label="Top Batsman" />}
                        {topBowler  && <RankingPlayerCard player={topBowler}  label="Top Bowler" />}
                      </View>
                    )}
                  </View>
                );

              case 'wc_history':
                return statCards.length > 0 && (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader emoji="📊" title="WC History · 1970–2022" />
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -spacing.lg }}
                      contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
                    >
                      {statCards.map((c, i) => <WCStatCard key={i} card={c} />)}
                    </ScrollView>
                  </View>
                );

              case 'did_you_know':
                return (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader emoji="💡" title="Did You Know?" />
                    {todayFacts.map((f, i) => (
                      <FactCard key={i} icon={f.icon} text={f.text} color={f.color} />
                    ))}
                  </View>
                );

              case 'wc_groups':
                return groupPairs.length > 0 && (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader
                      emoji="⚽"
                      title="Group Stage Preview"
                      onMore={goToFootball}
                      moreLabel="All groups →"
                    />
                    {groupPairs.map(([name, standings]) => (
                      <GroupTable key={name} groupName={name} standings={standings} />
                    ))}
                  </View>
                );

              case 'latest_news':
                return topNews.length > 0 && (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader emoji="📰" title="Latest Cricket News" />
                    {topNews.map(item => (
                      <NewsCard
                        key={item.id}
                        item={item}
                        onPress={() => router.push(`/(news-detail)/${item.id}` as any)}
                      />
                    ))}
                  </View>
                );

              case 'leagues_explore':
                return null;

              default:
                return null;
            }
          })}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
