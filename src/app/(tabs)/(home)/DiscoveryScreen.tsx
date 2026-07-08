import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLeague } from '@/contexts/LeagueContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { useHomeFeed } from '@/hooks/useHomeFeed';
import { useWCHistoryStats } from '@/hooks/useWCHistoryStats';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useWC2026Groups } from '@/hooks/useWC2026Groups';
import { useHomeNews, useHomeRankings, useHomeFacts, useHomeSections, useAccuracy, useLeagueCards } from '@/hooks/useHome';
import type { RecentPrediction } from '@/hooks/useHome';
import { useTipsList } from '@/hooks/useTips';
import { useLeagueTable } from '@/hooks/useMatches';
import type { SportTab } from '@/components/LeagueSheet';
import { GroupTable } from '@/components/GroupTable';
import { BannerCarousel } from '@/components/BannerCarousel';
import { colors, spacing, font, radius } from '@/constants/theme';
import {
  C_CRICKET, C_FOOTBALL, C_LIVE,
  isToday, greeting, fmtDate,
  SectionHeader, LiveSectionHeader, EmptyCard, SportPill,
  CricketMatchCard, FootballMatchCard, NewsCard, AIPickCard, CricketPickCard,
  MiniStandingsTable, WCCountdownBanner,
  WC_FACTS, CRICKET_FACTS, fbFlag, WCStatCard, FactCard, RankingTeamCard, RankingPlayerCard,
  AccuracyBadge, LeagueTrackRecordCard,
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

// ── Main Screen ───────────────────────────────────────────────

interface Props {
  onOpenLeagueSheet: (sport?: SportTab) => void;
  onOpenDrawer:      () => void;
  onNavigateLeagueHome: (slug: string) => void;
}

export default function DiscoveryScreen({ onOpenLeagueSheet, onOpenDrawer, onNavigateLeagueHome }: Props) {
  const router          = useRouter();
  const { league, setLeagueId } = useLeague();
  const { unreadCount } = useNotificationBadge();

  const { cricket, football, isLoading, isRefetching, refetch } = useHomeFeed();
  const { data: wcStats }    = useWCHistoryStats();
  const { data: tips = [] }  = useFootballTips();
  const { data: groups }     = useWC2026Groups();
  const { data: news = [] }  = useHomeNews();
  const { data: cricketTips = [] } = useTipsList();
  const { data: apiFacts = [] }    = useHomeFacts(league.sport);
  const { data: standings = [] }   = useLeagueTable();
  const { data: rankings }         = useHomeRankings();
  const { data: homeSections = [] } = useHomeSections();
  const { data: accuracy }          = useAccuracy();
  const { data: leagueCards = [], refetch: refetchLeagueCards } = useLeagueCards(5);

  // Partition by today / upcoming
  const cLive      = cricket.live;
  const fLive      = football.live;
  const cToday     = cricket.upcoming.filter(m => isToday(m.date));
  const fToday     = football.upcoming.filter(m => isToday(m.date));
  const cUpcoming  = cricket.upcoming.filter(m => !isToday(m.date)).slice(0, 3);
  const fUpcoming  = football.upcoming.filter(m => !isToday(m.date)).slice(0, 4);
  const totalLive  = cLive.length + fLive.length;
  // Live matches already render in the "Live Now" section above — don't count
  // them here too, or this section shows an empty header with no fallback
  // message when the only thing happening today is already-live.
  const hasToday   = cToday.length + fToday.length > 0;
  const hasUpcoming = cUpcoming.length + fUpcoming.length > 0;
  const wcNotStarted = fLive.length === 0 && football.upcoming.length === 0;

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

  // Discretionary section order/visibility, admin-configured; fall back to
  // the bundled default order until home_sections has been seeded/fetched.
  const sectionOrder = homeSections.length > 0
    ? homeSections.filter(s => s.enabled).sort((a, b) => a.display_order - b.display_order).map(s => s.key)
    : DEFAULT_SECTION_ORDER;

  function goToCricket()  { setLeagueId('ipl');    router.push('/(tabs)/(matches)'); }
  function goToFootball() { setLeagueId('wc2026'); router.push('/(tabs)/(matches)'); }
  function goToTips()     { router.push('/(tabs)/(tips)'); }
  function goToMatches()  { setLeagueId(league.id); router.push('/(tabs)/(matches)'); }
  function goToTip(id: string) { router.push(`/(tip-detail)/${id}` as any); }
  function goToRecentPrediction(p: RecentPrediction) {
    // Match-details has no sport param of its own — it renders cricket vs
    // football based on the currently-selected league's sport, so that has
    // to be set correctly before navigating (same as goToCricket/goToFootball).
    if (p.sport === 'football') setLeagueId('wc2026');
    else if (league.sport !== 'cricket') setLeagueId('ipl');
    router.push(`/(match-details)/${p.id}` as any);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => { refetch(); refetchLeagueCards(); }}
              tintColor={C_CRICKET}
              colors={[C_CRICKET, C_FOOTBALL]}
            />
          }
        >
          {/* ── Header ─────────────────────────────── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: spacing.sm, marginBottom: spacing.xl,
          }}>
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: 32, fontFamily: 'BarlowCondensed_700Bold', letterSpacing: 0.3 }}>PredictX</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              {accuracy && (
                <AccuracyBadge percentage={accuracy.percentage} sampleSize={accuracy.sampleSize} />
              )}
              <Pressable
                onPress={() => router.push('/(settings)/notifications' as any)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                })}>
                <Ionicons name="notifications-outline" size={18} color={colors.textPrimary} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: C_LIVE }} />
                )}
              </Pressable>
              <Pressable
                onPress={onOpenDrawer}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  width: 38, height: 38, borderRadius: 19,
                  backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                })}>
                <Ionicons name="menu-outline" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* ── Sport pills ────────────────────────── */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xl }}>
            <SportPill emoji="🏏" label="Cricket"  color={C_CRICKET}  textColor="#101400" active={league.sport === 'cricket'}  onPress={() => onOpenLeagueSheet('cricket')}  />
            <SportPill emoji="⚽" label="Football" color={C_FOOTBALL} textColor="#FFFFFF" active={league.sport === 'football'} onPress={() => onOpenLeagueSheet('football')} />
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
          <BannerCarousel placement="discovery" onNavigateLeagueHome={onNavigateLeagueHome} />

          {/* ── PredictX Prediction (per-league track record) ────── */}
          {leagueCards.length > 0 && (
            <View style={{
              marginBottom: spacing.xl, backgroundColor: colors.bg, borderRadius: radius.lg,
              borderWidth: 1, borderColor: colors.border, padding: spacing.md,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                <Ionicons name="trending-up" size={18} color={colors.accent} style={{ marginRight: 6 }} />
                <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>PredictX Prediction</Text>
              </View>
              {leagueCards.map((card, i) => (
                <LeagueTrackRecordCard key={card.slug} card={card} index={i} defaultExpanded={i === 0} onPressMatch={goToRecentPrediction} />
              ))}
              <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: spacing.xs }}>
                Powered by PredictX AI
              </Text>
            </View>
          )}

          {/* ── Live Now ───────────────────────────── */}
          {totalLive > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <LiveSectionHeader count={totalLive} />
              {cLive.map(m => <CricketMatchCard  key={m.id} match={m} onPress={goToCricket} leagueLabel={m.leagueLabel} />)}
              {fLive.map(m => <FootballMatchCard key={m.id} match={m} onPress={goToFootball} />)}
            </View>
          )}

          {/* ── Today ──────────────────────────────── */}
          <View style={{ marginBottom: spacing.xl }}>
            <SectionHeader emoji="📅" title="Today" />
            {cToday.map(m => <CricketMatchCard  key={m.id} match={m} onPress={goToCricket} leagueLabel={m.leagueLabel} />)}
            {fToday.map(m => <FootballMatchCard key={m.id} match={m} onPress={goToFootball} />)}
            {wcNotStarted && <WCCountdownBanner onPress={goToFootball} />}
            {!hasToday && !wcNotStarted && !isLoading && (
              <EmptyCard message="No matches scheduled today — check Coming Up for what's next" />
            )}
          </View>

          {/* ── Coming Up ──────────────────────────── */}
          {hasUpcoming && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="📆" title="Coming Up" onMore={() => router.push('/(tabs)/(matches)')} />
              {cUpcoming.map(m => <CricketMatchCard  key={m.id} match={m} onPress={goToCricket} leagueLabel={m.leagueLabel} />)}
              {fUpcoming.map(m => <FootballMatchCard key={m.id} match={m} onPress={goToFootball} />)}
            </View>
          )}

          {/* ── PredictX Picks ───────────────────────── */}
          {league.sport === 'cricket' ? (
            upcomingCricketTips.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader emoji="🤖" title="PredictX Picks" onMore={goToTips} moreLabel="All picks →" />
                {upcomingCricketTips.map(t => (
                  <CricketPickCard key={t.id} match={t} onPress={() => goToTip(t.id)} />
                ))}
              </View>
            )
          ) : (
            upcomingTips.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader emoji="🤖" title="PredictX Picks" onMore={goToTips} moreLabel="All picks →" />
                {upcomingTips.map(t => (
                  <AIPickCard key={t.id} tip={t} onPress={goToFootball} />
                ))}
              </View>
            )
          )}

          {/* ── Discretionary sections, order/visibility from admin ── */}
          {sectionOrder.map(key => {
            switch (key) {
              case 'points_table':
                return league.sport === 'cricket' && standings.length > 0 && (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader emoji="🏆" title="Points Table" onMore={goToMatches} moreLabel="Full table →" />
                    <MiniStandingsTable rows={standings} limit={4} />
                  </View>
                );

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
                return (
                  <View key={key} style={{ marginBottom: spacing.xl }}>
                    <SectionHeader emoji="🏟" title="Leagues" onMore={() => onOpenLeagueSheet()} />
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <LeagueCard emoji="🏏" title="Cricket"  subtitle="IPL · PSL · T20 WC · BBL" color={C_CRICKET}  onPress={goToCricket}  />
                      <LeagueCard emoji="⚽" title="Football" subtitle="FIFA World Cup 2026"        color={C_FOOTBALL} onPress={goToFootball} />
                    </View>
                  </View>
                );

              default:
                return null;
            }
          })}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
