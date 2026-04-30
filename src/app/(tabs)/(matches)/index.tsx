/**
 * Matches screen — CricketIQ
 *
 * Tabs: Live | Fixtures | Results | Table
 *   Live     → WS-driven real-time scores (Cricbuzz)
 *   Fixtures → Full IPL 2026 schedule grouped by date
 *   Results  → Completed matches, most recent first
 *   Table    → IPL 2026 points table
 */

import {
  View,
  Text,
  Pressable,
  SectionList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { MatchCardSkeleton } from '@/components/MatchCardSkeleton';
import { useMatchCategories, useIPLFixtures, useIPLTable } from '@/hooks/useMatches';
import { useLiveScores, type LiveScore } from '@/hooks/useLiveScores';
import { dedupeMatches, type AdaptedMatch } from '@/utils/matchAdapter';
import { colors, spacing, font, radius } from '@/constants/theme';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import type { StandingsRow } from '@/services/matchService';

// ── Live score patch ──────────────────────────────────────────
// Guard: never promote an API-completed match to live via WS.

function patchWithLive(
  match:        AdaptedMatch,
  getLiveScore: (t1: string, t2: string) => LiveScore | null,
): AdaptedMatch {
  if (match.isCompleted) return match;
  const live = getLiveScore(match.team1Short, match.team2Short);
  if (!live) return match;
  const status = live.status !== 'upcoming' ? live.status : match.status;
  return {
    ...match,
    score1:      live.score1      ?? match.score1,
    score2:      live.score2      ?? match.score2,
    overs1:      live.overs1      ?? match.overs1,
    overs2:      live.overs2      ?? match.overs2,
    statusText:  live.statusText  || match.statusText,
    status,
    isLive:      status === 'live',
    isUpcoming:  status === 'upcoming',
    isCompleted: status === 'completed',
  };
}

// ── Types ─────────────────────────────────────────────────────

const TABS = ['Live', 'Fixtures', 'Results', 'Table'] as const;
type Tab = (typeof TABS)[number];

interface Section {
  title: string;
  data:  AdaptedMatch[];
}

// ── Date grouping ─────────────────────────────────────────────

function dateLabel(iso: string): string {
  if (!iso) return 'TBD';
  const d         = new Date(iso);
  const now       = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const matchDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff      = matchDay - today;
  if (diff === 0)           return 'TODAY';
  if (diff === 86_400_000)  return 'TOMORROW';
  if (diff === -86_400_000) return 'YESTERDAY';
  return d
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase().replace(',', '');
}

function groupByDate(matches: AdaptedMatch[]): Section[] {
  const map = new Map<string, AdaptedMatch[]>();
  for (const m of matches) {
    const key = dateLabel(m.date);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

// ── LiveHeroCard ──────────────────────────────────────────────

function LiveHeroCard({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.93 : 1 })}>
      <LinearGradient
        colors={[c1 + '28', '#0D1421', '#0D1421', c2 + '28']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{
          borderRadius:  radius.xl,
          borderWidth:   1,
          borderColor:   colors.live + '35',
          padding:       spacing.xxl,
          marginBottom:  spacing.lg,
          shadowColor:   colors.live,
          shadowOffset:  { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius:  20,
          elevation:     10,
        }}
      >
        {/* Top row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: colors.live + '18', borderRadius: 20,
            paddingHorizontal: 10, paddingVertical: 4,
            borderWidth: 1, borderColor: colors.live + '40',
          }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
            <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 1.2 }}>LIVE</Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: font.xs }} numberOfLines={1}>
            {match.matchDesc}
          </Text>
        </View>

        {/* Teams face-off */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            {logo1
              ? <Image source={{ uri: logo1 }} style={{ width: 68, height: 68 }} resizeMode="contain" />
              : <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c1 + '25', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c1, fontSize: 20, fontWeight: '800' }}>{match.team1Short}</Text>
                </View>
            }
            <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '700' }}>{match.team1Short}</Text>
            {match.score1 ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{match.score1}</Text>
                {match.overs1 ? <Text style={{ color: colors.textMuted, fontSize: font.xs }}>({match.overs1} ov)</Text> : null}
              </View>
            ) : null}
          </View>

          <View style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
            <Text style={{ color: colors.textMuted + '60', fontSize: 22, fontWeight: '900' }}>VS</Text>
          </View>

          <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
            {logo2
              ? <Image source={{ uri: logo2 }} style={{ width: 68, height: 68 }} resizeMode="contain" />
              : <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: c2 + '25', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: c2, fontSize: 20, fontWeight: '800' }}>{match.team2Short}</Text>
                </View>
            }
            <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '700' }}>{match.team2Short}</Text>
            {match.score2 ? (
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>{match.score2}</Text>
                {match.overs2 ? <Text style={{ color: colors.textMuted, fontSize: font.xs }}>({match.overs2} ov)</Text> : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Status line */}
        {match.statusText ? (
          <View style={{
            marginTop: spacing.lg, backgroundColor: '#ffffff08',
            borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14,
          }}>
            <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '600', textAlign: 'center' }}>
              {match.statusText}
            </Text>
          </View>
        ) : null}

        {/* Venue */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, gap: 3 }}>
          <Ionicons name="location-outline" size={11} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>{match.venue}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── LiveBanner (compact Fixtures tab strip) ───────────────────

function LiveBanner({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.lg })}>
      <LinearGradient
        colors={[colors.live + '18', colors.live + '06']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={{
          flexDirection: 'row', alignItems: 'center',
          borderRadius: radius.md, padding: spacing.md,
          borderWidth: 1, borderColor: colors.live + '30', gap: spacing.md,
        }}
      >
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.8 }}>
            MATCH IN PROGRESS
          </Text>
          <Text style={{ color: '#fff', fontSize: font.sm, fontWeight: '600', marginTop: 2 }}>
            {match.team1Short} vs {match.team2Short}
            {match.score1 ? ` · ${match.score1}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '700' }}>View Live</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.live} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// ── IPL Points Table ──────────────────────────────────────────

const LAST5_COLOR: Record<string, string> = {
  W: colors.success,
  L: colors.live,
  N: colors.textMuted,
};

const TABLE_COLS = [
  { label: 'M',   key: 'played'  as keyof StandingsRow, width: 28 },
  { label: 'W',   key: 'wins'    as keyof StandingsRow, width: 28 },
  { label: 'L',   key: 'losses'  as keyof StandingsRow, width: 28 },
  { label: 'Pts', key: 'points'  as keyof StandingsRow, width: 36, accent: true },
] as const;

function IPLTableView({ rows, isLoading }: { rows: StandingsRow[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <ActivityIndicator color={colors.accent} />
        <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.md }}>Loading standings…</Text>
      </View>
    );
  }
  if (rows.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 60 }}>
        <MaterialCommunityIcons name="table" size={44} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: font.md, marginTop: spacing.lg, textAlign: 'center' }}>
          Points table updating…
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center' }}>
          Check back after a few matches
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Playoff legend pill */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: spacing.md,
      }}>
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: colors.success }} />
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Top 4 qualify for playoffs</Text>
      </View>

      <View style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderWidth: 1, borderColor: colors.border,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
          backgroundColor: colors.cardElevated,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Text style={{ width: 26, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>#</Text>
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>TEAM</Text>
          {TABLE_COLS.map(col => (
            <Text key={col.label} style={{ width: col.width, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }}>
              {col.label}
            </Text>
          ))}
          <Text style={{ width: 58, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }}>FORM</Text>
        </View>

        {rows.map((row, i) => {
          const isTop4      = i < 4;
          const teamColor   = getTeamColor(row.teamShort);
          const isLastTop4  = i === 3;

          return (
            <View key={row.teamShort || String(i)}>
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: spacing.md, paddingVertical: 11,
                borderBottomWidth: (!isLastTop4 && i < rows.length - 1) ? 1 : 0,
                borderBottomColor: colors.border,
                backgroundColor: i % 2 === 1 ? '#ffffff03' : 'transparent',
              }}>
                {/* Qualifier bar */}
                <View style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                  backgroundColor: isTop4 ? colors.success + '55' : 'transparent',
                }} />

                <Text style={{ width: 26, color: isTop4 ? colors.success : colors.textMuted, fontSize: font.sm, fontWeight: '700' }}>
                  {i + 1}
                </Text>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                  {row.logo ? (
                    <Image source={{ uri: row.logo }} style={{ width: 24, height: 24, marginRight: spacing.sm }} resizeMode="contain" />
                  ) : (
                    <View style={{
                      width: 24, height: 24, borderRadius: 12, marginRight: spacing.sm,
                      backgroundColor: teamColor + '25', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: teamColor, fontSize: 8, fontWeight: '700' }}>{row.teamShort.slice(0, 2)}</Text>
                    </View>
                  )}
                  <Text style={{
                    color: isTop4 ? '#fff' : colors.textSecondary,
                    fontSize: font.sm, fontWeight: isTop4 ? '700' : '500',
                  }} numberOfLines={1}>
                    {row.teamShort}
                  </Text>
                </View>

                {TABLE_COLS.map(col => (
                  <Text key={col.label} style={{
                    width: col.width,
                    color: col.accent ? colors.accent : colors.textSecondary,
                    fontSize: font.sm, fontWeight: col.accent ? '700' : '500', textAlign: 'center',
                  }}>
                    {String(row[col.key])}
                  </Text>
                ))}

                <View style={{ width: 58, flexDirection: 'row', justifyContent: 'center', gap: 3 }}>
                  {(row.last5.length > 0 ? row.last5 : Array(5).fill('N')).map((r, idx) => (
                    <View key={idx} style={{
                      width: 9, height: 9, borderRadius: 5,
                      backgroundColor: LAST5_COLOR[r] ?? colors.textMuted + '30',
                    }} />
                  ))}
                </View>
              </View>

              {/* Playoff cut-off line */}
              {isLastTop4 && i < rows.length - 1 && (
                <View style={{
                  height: 1, marginHorizontal: spacing.md,
                  backgroundColor: colors.success + '45',
                }} />
              )}
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Qualifies</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {[
            { color: colors.success, label: 'W' },
            { color: colors.live,    label: 'L' },
            { color: colors.textMuted + '60', label: 'N/R' },
          ].map(({ color, label }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
              <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────

function DateGroupHeader({ label }: { label: string }) {
  const isToday = label === 'TODAY';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm }}>
      <View style={{
        backgroundColor: isToday ? colors.accent + '20' : 'transparent',
        borderRadius: 6,
        paddingHorizontal: isToday ? 8 : 0,
        paddingVertical: isToday ? 3 : 0,
      }}>
        <Text style={{
          color: isToday ? colors.accent : colors.textSecondary,
          fontSize: font.xs, fontWeight: '800', letterSpacing: 1.5,
        }}>
          {label}
        </Text>
      </View>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border, marginLeft: spacing.sm }} />
    </View>
  );
}

function LoadingState() {
  return (
    <View style={{ paddingTop: spacing.sm }}>
      <MatchCardSkeleton />
      <MatchCardSkeleton />
      <MatchCardSkeleton />
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <View style={{
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.dangerDim, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
      }}>
        <Ionicons name="cloud-offline" size={32} color={colors.danger} />
      </View>
      <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700', marginBottom: spacing.sm }}>
        Connection Error
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginBottom: spacing.xxl, textAlign: 'center' }}>
        Check your connection and try again
      </Text>
      <Pressable onPress={onRetry} style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1, backgroundColor: colors.accent,
        borderRadius: radius.sm, paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md,
      })}>
        <Text style={{ color: '#07080F', fontSize: font.md, fontWeight: '700' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const msgs: Record<Tab, { icon: string; title: string; sub: string }> = {
    Live:     { icon: 'radio-outline',    title: 'No live matches right now',      sub: 'We\'ll show live scores here when IPL is on' },
    Fixtures: { icon: 'calendar-outline', title: 'No upcoming IPL 2026 fixtures',  sub: 'Check back soon' },
    Results:  { icon: 'trophy-outline',   title: 'No completed matches yet',       sub: 'Results will appear here after each game' },
    Table:    { icon: 'stats-chart',      title: 'Points table unavailable',       sub: '' },
  };
  const { icon, title, sub } = msgs[tab];
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <View style={{
        width: 64, height: 64, borderRadius: 20,
        backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
      }}>
        <Ionicons name={icon as any} size={28} color={colors.textMuted} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: font.md, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center' }}>{sub}</Text> : null}
    </View>
  );
}

// ── Tab bar ───────────────────────────────────────────────────

function TabBar({ active, onPress, liveCount }: {
  active:    Tab;
  onPress:   (t: Tab) => void;
  liveCount: number;
}) {
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      padding: 4,
      borderWidth: 1, borderColor: colors.border,
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    }}>
      {TABS.map(t => {
        const isActive  = t === active;
        const isLiveTab = t === 'Live';
        const activeColor = isLiveTab ? colors.live : colors.accent;

        return (
          <Pressable
            key={t}
            onPress={() => onPress(t)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.md,
              backgroundColor: isActive ? activeColor + '18' : 'transparent',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'row', gap: 4,
              opacity: pressed ? 0.85 : 1,
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive ? activeColor + '40' : 'transparent',
            })}
          >
            {isLiveTab && liveCount > 0 && !isActive && (
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
            )}
            <Text style={{
              color:      isActive ? activeColor : colors.textSecondary,
              fontSize:   font.xs,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}>
              {t.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function MatchesScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Fixtures');

  const {
    liveMatches,
    upcomingMatches,
    completedMatches,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useMatchCategories();

  const { data: fixtures = [] }                             = useIPLFixtures();
  const { data: tableRows = [], isLoading: tableLoading }   = useIPLTable();
  const { getLiveScore, scores: wsScores, connected: wsConnected } = useLiveScores();

  // Fixtures: upcoming from API + future fixtures (deduped)
  const mergedUpcoming = useMemo(() => {
    const fixtureUpcoming = fixtures.filter(f => f.isUpcoming);
    return dedupeMatches([...upcomingMatches, ...fixtureUpcoming]);
  }, [upcomingMatches, fixtures]);

  // Effective live: WS-confirmed live matches from live + upcoming only.
  // When WS is connected it is authoritative — empty scores means nothing is live.
  const effectiveLiveMatches = useMemo(() => {
    if (wsConnected) {
      if (wsScores.size === 0) return [];
      const candidates = dedupeMatches([...liveMatches, ...upcomingMatches]);
      return candidates
        .map(m => {
          const ws = getLiveScore(m.team1Short, m.team2Short);
          return ws?.status === 'live' ? patchWithLive(m, getLiveScore) : null;
        })
        .filter((m): m is AdaptedMatch => m !== null);
    }
    // WS not yet connected: fall back to REST data
    return liveMatches;
  }, [liveMatches, upcomingMatches, getLiveScore, wsScores, wsConnected]);

  const liveCount = effectiveLiveMatches.length;

  // Section data per tab
  const fixturesSections = useMemo(() => groupByDate(mergedUpcoming), [mergedUpcoming]);

  const resultsSections = useMemo(() => {
    const sorted = [...completedMatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return groupByDate(sorted);
  }, [completedMatches]);

  const handleMatchPress = useCallback((id: string) => {
    router.push(`/(match-details)/${id}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: AdaptedMatch }) => (
    <MatchCard match={patchWithLive(item, getLiveScore)} onPress={handleMatchPress} />
  ), [handleMatchPress, getLiveScore]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <DateGroupHeader label={section.title} />
  ), []);

  // ── List header (app title + tab bar + tab-specific non-list content) ──

  const ListHeader = (
    <View>
      {/* App header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 }}>
        <View>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>IPL 2026</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>Matches</Text>
          <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>Schedule & results</Text>
        </View>
        {liveCount > 0 && (
          <Pressable onPress={() => setTab('Live')} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.live + '15', borderRadius: 20,
              paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: colors.live + '35',
            }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
              <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800' }}>
                {liveCount} LIVE
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* Tab bar */}
      <TabBar active={tab} onPress={setTab} liveCount={liveCount} />

      {/* Loading / Error */}
      {isLoading && <LoadingState />}
      {isError   && <ErrorState onRetry={refetch} />}

      {/* ── Live tab content (not list-based) ── */}
      {tab === 'Live' && !isLoading && !isError && (
        liveCount === 0
          ? <EmptyState tab="Live" />
          : effectiveLiveMatches.map(m => (
              <LiveHeroCard
                key={m.id}
                match={patchWithLive(m, getLiveScore)}
                onPress={() => handleMatchPress(m.id)}
              />
            ))
      )}

      {/* ── Fixtures tab: live banner + empty state ── */}
      {tab === 'Fixtures' && !isLoading && !isError && (
        <>
          {liveCount > 0 && (
            <LiveBanner match={effectiveLiveMatches[0]} onPress={() => setTab('Live')} />
          )}
          {fixturesSections.length === 0 && <EmptyState tab="Fixtures" />}
        </>
      )}

      {/* ── Results tab: empty state only (list handles cards) ── */}
      {tab === 'Results' && !isLoading && !isError && resultsSections.length === 0 && (
        <EmptyState tab="Results" />
      )}

      {/* ── Table tab ── */}
      {tab === 'Table' && !isLoading && !isError && (
        <IPLTableView rows={tableRows} isLoading={tableLoading} />
      )}
    </View>
  );

  // Only Fixtures and Results tabs use SectionList rows
  const activeSections: Section[] =
    !isLoading && !isError && (tab === 'Fixtures' || tab === 'Results')
      ? tab === 'Fixtures' ? fixturesSections : resultsSections
      : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <SectionList<AdaptedMatch, Section>
          sections={activeSections}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingTop:        spacing.sm,
            paddingBottom:     100,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.accent}
              colors={[colors.accent]}
              progressBackgroundColor={colors.card}
            />
          }
        />
      </SafeAreaView>
    </View>
  );
}
