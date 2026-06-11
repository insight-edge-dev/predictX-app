import {
  View, Text, ScrollView, Pressable, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useLeague, useIsFootball } from '@/contexts/LeagueContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { useMatchCategories, useLeagueTable } from '@/hooks/useMatches';
import { useTipsList } from '@/hooks/useTips';
import { useHomeNews, useExpertPredictions } from '@/hooks/useHome';
import { useFootballMatches } from '@/hooks/useFootballMatches';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useWC2026Groups } from '@/hooks/useWC2026Groups';
import { useWCHistoryStats } from '@/hooks/useWCHistoryStats';
import type { SportTab } from '@/components/LeagueSheet';
import { GroupTable } from '@/components/GroupTable';
import { colors, spacing, font, radius } from '@/constants/theme';
import {
  C_CRICKET, C_FOOTBALL, C_LIVE,
  isToday, greeting, fmtDate,
  SectionHeader, EmptyCard, SportPill,
  CricketMatchCard, FootballMatchCard, NewsCard, AIPickCard, CricketPickCard,
  MiniStandingsTable, WCCountdownBanner, WCStatCard, FactCard, ExpertPickCard,
  WC_FACTS, fbFlag,
  type StatCard,
} from '@/components/home/HomeShared';

// ── Props ─────────────────────────────────────────────────────

interface Props {
  onOpenLeagueSheet: (sport?: SportTab) => void;
  onOpenDrawer:      () => void;
  onBackToDiscovery: () => void;
}

// ── Main Screen ───────────────────────────────────────────────

export default function LeagueHomeScreen(props: Props) {
  const isFootball = useIsFootball();
  return isFootball ? <FootballLeagueHome {...props} /> : <CricketLeagueHome {...props} />;
}

// ── Shared header ─────────────────────────────────────────────

function LeagueHomeHeader({ onOpenLeagueSheet, onOpenDrawer, onBackToDiscovery }: Props) {
  const router = useRouter();
  const { league } = useLeague();
  const { unreadCount } = useNotificationBadge();

  return (
    <>
      {/* ── Header ─────────────────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: spacing.sm, marginBottom: spacing.lg,
      }}>
        <View>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>PredictX</Text>
          <Text style={{ color: colors.textSecondary, fontSize: font.xs, marginTop: 2 }}>{greeting()} · {fmtDate()}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Pressable
            onPress={() => router.push('/(tabs)/(profile)/notifications' as any)}
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

      {/* ── Active league chip ─────────────────── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.card, borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        padding: spacing.md, marginBottom: spacing.lg,
      }}>
        <Text style={{ fontSize: 24 }}>{league.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }}>{league.name}</Text>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '600', marginTop: 2 }}>
            {league.country} · {league.season}
          </Text>
        </View>
      </View>

      {/* ── Sport pills ────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.xl }}>
        <SportPill emoji="🏏" label="Cricket"  color={C_CRICKET}  textColor="#101400" onPress={() => onOpenLeagueSheet('cricket')}  />
        <SportPill emoji="⚽" label="Football" color={C_FOOTBALL} textColor="#FFFFFF" onPress={() => onOpenLeagueSheet('football')} />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={onBackToDiscovery}
          style={({ pressed }) => ({
            opacity: pressed ? 0.8 : 1,
            flexDirection: 'row', alignItems: 'center', gap: 4,
            backgroundColor: colors.card,
            borderRadius: 20, borderWidth: 1, borderColor: colors.border,
            paddingHorizontal: 10, paddingVertical: 6,
          })}>
          <Ionicons name="home-outline" size={12} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: font.xs }}>All Sports</Text>
        </Pressable>
      </View>
    </>
  );
}

// ── Cricket league home ───────────────────────────────────────

function CricketLeagueHome(props: Props) {
  const router = useRouter();
  const { league } = useLeague();

  const { liveMatches, upcomingMatches, isLoading, isRefetching, refetch } = useMatchCategories();
  const { data: standings = [] } = useLeagueTable();
  const { data: tips = [] } = useTipsList();
  const { data: news = [] } = useHomeNews();
  const { data: expertPredictions = [] } = useExpertPredictions(league.id);

  const today    = upcomingMatches.filter(m => isToday(m.date));
  const upcoming = upcomingMatches.filter(m => !isToday(m.date)).slice(0, 5);
  const hasToday = liveMatches.length + today.length > 0;
  const leagueLabel = `${league.short} ${league.season}`;

  const upcomingTips = tips.filter(t => t.status === 'upcoming' && t.tip).slice(0, 2);
  const topNews = news.slice(0, 3);
  const expertPick = expertPredictions.find(p => p.confidence === 'HIGH') ?? expertPredictions[0] ?? null;

  function goToMatch(id: string) { router.push(`/(match-details)/${id}` as any); }
  function goToMatches() { router.push('/(tabs)/(matches)'); }
  function goToTip(id: string) { router.push(`/(tip-detail)/${id}` as any); }
  function goToExpert() { router.push('/(expert)' as any); }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C_CRICKET}
              colors={[C_CRICKET, C_FOOTBALL]}
            />
          }
        >
          <LeagueHomeHeader {...props} />

          {/* ── Live Now ───────────────────────────── */}
          {liveMatches.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="🔴" title="Live Now" badge={liveMatches.length} />
              {liveMatches.map(m => (
                <CricketMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} leagueLabel={leagueLabel} />
              ))}
            </View>
          )}

          {/* ── Today ──────────────────────────────── */}
          <View style={{ marginBottom: spacing.xl }}>
            <SectionHeader emoji="📅" title="Today" />
            {today.map(m => (
              <CricketMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} leagueLabel={leagueLabel} />
            ))}
            {!hasToday && !isLoading && (
              <EmptyCard message="No matches scheduled today — check Coming Up for what's next" />
            )}
          </View>

          {/* ── Coming Up ──────────────────────────── */}
          {upcoming.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="📆" title="Coming Up" onMore={goToMatches} />
              {upcoming.map(m => (
                <CricketMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} leagueLabel={leagueLabel} />
              ))}
            </View>
          )}

          {/* ── Expert's Pick ─────────────────────────── */}
          {expertPick && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="👤" title="Expert's Pick" onMore={goToExpert} moreLabel="Our Experts →" />
              <ExpertPickCard prediction={expertPick} onPress={goToExpert} />
            </View>
          )}

          {/* ── PredictX Picks ───────────────────────── */}
          {upcomingTips.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="🤖" title="PredictX Picks" onMore={() => router.push('/(tabs)/(tips)')} moreLabel="All picks →" />
              {upcomingTips.map(t => (
                <CricketPickCard key={t.id} match={t} onPress={() => goToTip(t.id)} />
              ))}
            </View>
          )}

          {/* ── Points Table ─────────────────────────── */}
          {standings.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="🏆" title="Points Table" onMore={goToMatches} moreLabel="Full table →" />
              <MiniStandingsTable rows={standings} limit={4} />
            </View>
          )}

          {/* ── Latest News ─────────────────────────── */}
          {topNews.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="📰" title="Latest Cricket News" />
              {topNews.map(item => (
                <NewsCard
                  key={item.id}
                  item={item}
                  onPress={() => router.push(`/(news-detail)/${item.id}` as any)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Football league home ──────────────────────────────────────

function FootballLeagueHome(props: Props) {
  const router = useRouter();
  const { league } = useLeague();
  const isWC2026 = league.id === 'wc2026';

  const { liveMatches, upcomingMatches, isLoading, isRefetching, refetch } = useFootballMatches();
  const { data: tips = [] }   = useFootballTips();
  const { data: groups }      = useWC2026Groups();
  const { data: wcStats }     = useWCHistoryStats();
  const { data: expertPredictions = [] } = useExpertPredictions(league.id);
  const expertPick = expertPredictions.find(p => p.confidence === 'HIGH') ?? expertPredictions[0] ?? null;

  const today    = upcomingMatches.filter(m => isToday(m.date));
  const upcoming = upcomingMatches.filter(m => !isToday(m.date)).slice(0, 4);
  const hasToday = liveMatches.length + today.length > 0;
  const wcNotStarted = isWC2026 && liveMatches.length === 0 && upcomingMatches.length === 0;

  const upcomingTips = tips.filter(t => t.status === 'upcoming' && t.tip).slice(0, 2);

  const groupPairs = groups
    ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).slice(0, 2)
    : [];

  // WC Stat Cards derived from historical data (wc2026 only)
  const statCards: StatCard[] = (isWC2026 && wcStats) ? [
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
  ] : [];

  // Pick 2 rotating facts by day (wc2026 only)
  const factStart = new Date().getDate() % WC_FACTS.length;
  const todayFacts = isWC2026 ? [WC_FACTS[factStart], WC_FACTS[(factStart + 1) % WC_FACTS.length]] : [];

  function goToMatch(id: string) { router.push(`/(match-details)/${id}?sport=football` as any); }
  function goToMatches() { router.push('/(tabs)/(matches)'); }
  function goToTip(id: string) { router.push(`/(tip-detail)/${id}?sport=football` as any); }
  function goToExpert() { router.push('/(expert)' as any); }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 110 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={C_CRICKET}
              colors={[C_CRICKET, C_FOOTBALL]}
            />
          }
        >
          <LeagueHomeHeader {...props} />

          {/* ── Live Now ───────────────────────────── */}
          {liveMatches.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="🔴" title="Live Now" badge={liveMatches.length} />
              {liveMatches.map(m => (
                <FootballMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} />
              ))}
            </View>
          )}

          {/* ── Today ──────────────────────────────── */}
          <View style={{ marginBottom: spacing.xl }}>
            <SectionHeader emoji="📅" title="Today" />
            {today.map(m => (
              <FootballMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} />
            ))}
            {wcNotStarted && <WCCountdownBanner onPress={goToMatches} />}
            {!hasToday && !wcNotStarted && !isLoading && (
              <EmptyCard message="No matches scheduled today — check Coming Up for what's next" />
            )}
          </View>

          {/* ── Coming Up ──────────────────────────── */}
          {upcoming.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="📆" title="Coming Up" onMore={goToMatches} />
              {upcoming.map(m => (
                <FootballMatchCard key={m.id} match={m} onPress={() => goToMatch(m.id)} />
              ))}
            </View>
          )}

          {/* ── Expert's Pick ─────────────────────────── */}
          {expertPick && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="👤" title="Expert's Pick" onMore={goToExpert} moreLabel="Our Experts →" />
              <ExpertPickCard prediction={expertPick} onPress={goToExpert} />
            </View>
          )}

          {/* ── PredictX Picks ───────────────────────── */}
          {upcomingTips.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="🤖" title="PredictX Picks" onMore={() => router.push('/(tabs)/(tips)')} moreLabel="All picks →" />
              {upcomingTips.map(t => (
                <AIPickCard key={t.id} tip={t} onPress={() => goToTip(t.id)} />
              ))}
            </View>
          )}

          {/* ── Group Stage Preview ─────────────────── */}
          {isWC2026 && groupPairs.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader
                emoji="⚽"
                title="Group Stage Preview"
                onMore={goToMatches}
                moreLabel="All groups →"
              />
              {groupPairs.map(([name, standings]) => (
                <GroupTable key={name} groupName={name} standings={standings} />
              ))}
            </View>
          )}

          {/* ── WC History Spotlight ───────────────── */}
          {statCards.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
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
          )}

          {/* ── Did You Know? ───────────────────────── */}
          {todayFacts.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader emoji="💡" title="Did You Know?" />
              {todayFacts.map((f, i) => (
                <FactCard key={i} icon={f.icon} text={f.text} color={f.color} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
