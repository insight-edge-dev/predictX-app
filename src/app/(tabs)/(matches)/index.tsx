/**
 * Matches screen — PredictX
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
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MatchCard } from '@/components/MatchCard';
import { MatchCardSkeleton } from '@/components/MatchCardSkeleton';
import { FootballMatchCard } from '@/components/FootballMatchCard';
import { GroupTable } from '@/components/GroupTable';
import { useMatchCategories, useIPLFixtures, useIPLTable } from '@/hooks/useMatches';
import { useFootballMatches } from '@/hooks/useFootballMatches';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useWC2026Groups } from '@/hooks/useWC2026Groups';
import { useTipsList } from '@/hooks/useTips';
import { useLeague, useIsFootball } from '@/contexts/LeagueContext';
import { useLiveScores, type LiveScore } from '@/hooks/useLiveScores';
import type { FootballMatch } from '@/types/football';
import { dedupeMatches, type AdaptedMatch } from '@/utils/matchAdapter';
import { LeagueSwitcher } from '@/components/LeagueSwitcher';
import { LeaguePickerGate } from '@/components/LeaguePickerGate';
import { colors, spacing, font, radius } from '@/constants/theme';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import type { StandingsRow } from '@/services/matchService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import api from '@/services/api';

// ── Prediction result resolver ────────────────────────────────
// Compares the AI-predicted winner against the actual match winner.

function resolvePredictionResult(
  tipWinner: string,
  match: AdaptedMatch,
): 'correct' | 'wrong' | null {
  if (!match.winner || !tipWinner) return null;
  const predicted = tipWinner.toLowerCase().trim();
  const t1s = match.team1Short.toLowerCase();
  const t2s = match.team2Short.toLowerCase();
  const t1n = match.team1Name.toLowerCase();
  const t2n = match.team2Name.toLowerCase();
  const actual = match.winner.toLowerCase();

  const predictedT1 =
    predicted === t1s || predicted === t1n ||
    t1n.startsWith(predicted) || predicted.startsWith(t1s) ||
    predicted.includes(t1n) || predicted.includes(` ${t1s}`) || predicted.endsWith(`(${t1s})`);
  const predictedT2 =
    predicted === t2s || predicted === t2n ||
    t2n.startsWith(predicted) || predicted.startsWith(t2s) ||
    predicted.includes(t2n) || predicted.includes(` ${t2s}`) || predicted.endsWith(`(${t2s})`);

  if (!predictedT1 && !predictedT2) return null;
  const team1Won = actual.includes(t1s) ||
    t1n.split(' ').some(w => w.length > 2 && actual.includes(w));
  if (predictedT1) return team1Won ? 'correct' : 'wrong';
  return team1Won ? 'wrong' : 'correct';
}

// ── Football prediction result resolver ───────────────────────
// Compares a predicted team name/short-code against the actual scoreline.

function resolveFootballPredictionResult(
  predictedWinner: string | null | undefined,
  match: FootballMatch,
): 'correct' | 'wrong' | null {
  if (!predictedWinner) return null;
  const { home, away } = match.score;
  if (home === null || away === null) return null;

  const predicted = predictedWinner.toLowerCase().trim();
  const homeShort  = match.homeTeam.shortName.toLowerCase();
  const awayShort  = match.awayTeam.shortName.toLowerCase();
  const homeName   = match.homeTeam.name.toLowerCase();
  const awayName   = match.awayTeam.name.toLowerCase();

  const predictedHome =
    predicted === homeShort || predicted === homeName ||
    homeName.startsWith(predicted) || predicted.startsWith(homeShort) || predicted.includes(homeName);
  const predictedAway =
    predicted === awayShort || predicted === awayName ||
    awayName.startsWith(predicted) || predicted.startsWith(awayShort) || predicted.includes(awayName);
  const predictedDraw = predicted === 'draw' || predicted === 'tie';

  if (!predictedHome && !predictedAway && !predictedDraw) return null;

  if (home === away) return predictedDraw ? 'correct' : 'wrong';

  const homeWon = home > away;
  if (predictedDraw)  return 'wrong';
  if (predictedHome)  return homeWon ? 'correct' : 'wrong';
  return homeWon ? 'wrong' : 'correct';
}

// ── Global expert predictions (real-time) ─────────────────────
// Shared by Cricket and Football results tabs to compute
// expert-prediction correctness badges for completed matches.

function useGlobalExpertPredictions() {
  const queryClient = useQueryClient();
  const { data: expertPredictions = [] } = useQuery<{ id: string; match_id: string | null; predicted_winner: string }[]>({
    queryKey:             ['expert-predictions'],
    queryFn:              async () => {
      const res = await api.get<{ predictions: any[] }>('/expert-predictions');
      return res.predictions ?? [];
    },
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`expert_pred_matches_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expert_predictions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['expert-predictions'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return expertPredictions;
}

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

const TABS          = ['Live', 'Fixtures', 'Results', 'Table']   as const;
const FOOTBALL_TABS = ['Live', 'Fixtures', 'Results', 'Groups'] as const;
type Tab         = (typeof TABS)[number];
type FootballTab = (typeof FOOTBALL_TABS)[number];

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

function LiveHeroCard({ match, onPress, lastUpdatedAt = 0 }: {
  match: AdaptedMatch; onPress: () => void; lastUpdatedAt?: number;
}) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const [secAgo, setSecAgo] = useState(0);
  useEffect(() => {
    if (!lastUpdatedAt) return;
    const tick = () => setSecAgo(Math.floor((Date.now() - lastUpdatedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [lastUpdatedAt]);

  const updatedLabel = !lastUpdatedAt ? 'Connecting...'
    : secAgo < 5  ? 'Just now'
    : secAgo < 60 ? `${secAgo}s ago`
    : `${Math.floor(secAgo / 60)}m ago`;
  const updatedColor = !lastUpdatedAt ? colors.textMuted : secAgo < 15 ? colors.success : secAgo < 35 ? colors.accent : colors.live;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius:    radius.xl,
          borderWidth:     1,
          borderColor:     '#FECACA',
          marginBottom:    spacing.lg,
          overflow:        'hidden',
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 2 },
          shadowOpacity:   0.07,
          shadowRadius:    8,
          elevation:       3,
        }}
      >
        {/* Live accent bar */}
        <View style={{ height: 3, backgroundColor: colors.live }} />

        <View style={{ padding: spacing.xl }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live, opacity: pulseAnim }} />
              <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.8 }}>LIVE</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '500' }} numberOfLines={1}>{match.matchDesc}</Text>
              {updatedLabel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="sync-outline" size={9} color={updatedColor} />
                  <Text style={{ color: updatedColor, fontSize: 9, fontWeight: '600' }}>{updatedLabel}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Teams */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              {logo1
                ? <Image source={{ uri: logo1 }} style={{ width: 64, height: 64 }} resizeMode="contain" />
                : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c1 + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c1, fontSize: 18, fontWeight: '800' }}>{match.team1Short}</Text>
                  </View>
              }
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{match.team1Short}</Text>
              {match.score1 ? (
                <>
                  <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>{match.score1}</Text>
                  {match.overs1 ? <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{match.overs1} ov</Text> : null}
                </>
              ) : <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Yet to bat</Text>}
            </View>

            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
              <Text style={{ color: colors.textMuted, fontSize: font.sm, fontWeight: '600', letterSpacing: 1 }}>vs</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              {logo2
                ? <Image source={{ uri: logo2 }} style={{ width: 64, height: 64 }} resizeMode="contain" />
                : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c2 + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c2, fontSize: 18, fontWeight: '800' }}>{match.team2Short}</Text>
                  </View>
              }
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{match.team2Short}</Text>
              {match.score2 ? (
                <>
                  <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>{match.score2}</Text>
                  {match.overs2 ? <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{match.overs2} ov</Text> : null}
                </>
              ) : <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Yet to bat</Text>}
            </View>
          </View>

          {/* Status text */}
          {match.statusText ? (
            <View style={{ marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
              <Text style={{ color: colors.live, fontSize: font.sm, fontWeight: '600', textAlign: 'center' }}>
                {match.statusText}
              </Text>
            </View>
          ) : null}

          {/* Venue */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, gap: 3 }}>
            <Ionicons name="location-outline" size={10} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>{match.venue}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── LiveBanner (compact Fixtures tab strip) ───────────────────

function LiveBanner({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.lg })}>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: colors.card,
          borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.border,
          borderLeftWidth: 3, borderLeftColor: colors.live,
          padding: spacing.md, gap: spacing.md,
          shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
        }}
      >
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
            MATCH IN PROGRESS
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600', marginTop: 2 }}>
            {match.team1Short} vs {match.team2Short}
            {match.score1 ? ` · ${match.score1}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '600' }}>View Live</Text>
          <Ionicons name="chevron-forward" size={12} color={colors.accent} />
        </View>
      </View>
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
                backgroundColor: i % 2 === 1 ? colors.borderLight : 'transparent',
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
                    color: isTop4 ? colors.textPrimary : colors.textSecondary,
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

const STAGE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  'Round of 32':   { bg: '#EFF6FF', text: '#1D4ED8' },
  'Round of 16':   { bg: '#EFF6FF', text: '#2563EB' },
  'Quarter-Final': { bg: '#FFF7ED', text: '#C2410C' },
  'Semi-Final':    { bg: '#F5F3FF', text: '#6D28D9' },
  '3rd Place':     { bg: '#F0FDF4', text: '#15803D' },
  'Final':         { bg: '#FFFBEB', text: '#B45309' },
};

function StageHeader({ stage }: { stage: string }) {
  const c = STAGE_BADGE_COLORS[stage] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      marginBottom: spacing.sm, marginTop: spacing.xl,
    }}>
      <View style={{
        backgroundColor: c.bg, borderRadius: 8,
        paddingHorizontal: spacing.md, paddingVertical: 5,
        borderWidth: 1, borderColor: c.text + '30',
      }}>
        <Text style={{ color: c.text, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>
          {stage.toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, height: 1, backgroundColor: c.text + '20', marginLeft: spacing.sm }} />
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
      <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', marginBottom: spacing.sm }}>
        Connection Error
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginBottom: spacing.xxl, textAlign: 'center' }}>
        Check your connection and try again
      </Text>
      <Pressable onPress={onRetry} style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1, backgroundColor: colors.accent,
        borderRadius: radius.sm, paddingHorizontal: spacing.xxxl, paddingVertical: spacing.md,
      })}>
        <Text style={{ color: '#FFFFFF', fontSize: font.md, fontWeight: '700' }}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ── ChampionBanner (shown on Fixtures tab when season is over) ─

function ChampionBanner({
  champ, runner, finalResult, leagueName,
}: {
  champ:       { name: string; short: string; logo: string };
  runner:      { name: string; short: string; logo: string };
  finalResult: string;
  leagueName:  string;
}) {
  const champColor  = getTeamColor(champ.short);
  const runnerColor = getTeamColor(runner.short);
  const champLogo   = getTeamLogo(champ.logo,  champ.short);
  const runnerLogo  = getTeamLogo(runner.logo, runner.short);
  return (
    <View
      style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden', marginBottom: spacing.xl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View style={{ height: 3, backgroundColor: '#F59E0B' }} />
      <View style={{ padding: spacing.xl, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: spacing.sm }}>
          <Ionicons name="trophy" size={13} color="#D97706" />
          <Text style={{ color: '#D97706', fontSize: font.xs, fontWeight: '700', letterSpacing: 1 }}>SEASON COMPLETE</Text>
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, marginBottom: spacing.xl }}>{leagueName}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-around' }}>
          {/* Champion */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: champColor + '18', borderWidth: 2.5, borderColor: '#F59E0B55', alignItems: 'center', justifyContent: 'center' }}>
              {champLogo
                ? <Image source={{ uri: champLogo }} style={{ width: 56, height: 56 }} resizeMode="contain" />
                : <Text style={{ color: champColor, fontSize: 18, fontWeight: '900' }}>{champ.short.slice(0,3)}</Text>
              }
            </View>
            <Text style={{ color: '#D97706', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>🏆 CHAMPIONS</Text>
            <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>{champ.short}</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>VS</Text>
            <View style={{ width: 1, height: 32, backgroundColor: colors.border }} />
          </View>

          {/* Runner-up */}
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: runnerColor + '12', borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              {runnerLogo
                ? <Image source={{ uri: runnerLogo }} style={{ width: 46, height: 46 }} resizeMode="contain" />
                : <Text style={{ color: runnerColor, fontSize: 14, fontWeight: '900' }}>{runner.short.slice(0,3)}</Text>
              }
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>🥈 RUNNERS-UP</Text>
            <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '700' }}>{runner.short}</Text>
          </View>
        </View>

        {!!finalResult && (
          <View style={{ marginTop: spacing.lg, backgroundColor: colors.cardElevated, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, alignSelf: 'stretch', alignItems: 'center' }}>
            <Text style={{ color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>{finalResult}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function EmptyState({ tab, leagueShort }: { tab: Tab | FootballTab; leagueShort: string }) {
  const msgs: Record<string, { icon: string; title: string; sub: string }> = {
    Live:     { icon: 'radio-outline',    title: 'No live matches right now',           sub: `Live scores appear here when ${leagueShort} is on` },
    Fixtures: { icon: 'calendar-outline', title: `No upcoming ${leagueShort} fixtures`, sub: 'Check back soon' },
    Results:  { icon: 'trophy-outline',   title: 'No completed matches yet',            sub: 'Results will appear here after each game' },
    Table:    { icon: 'stats-chart',      title: 'Points table unavailable',            sub: '' },
    Groups:   { icon: 'stats-chart',      title: 'Group standings loading…',            sub: 'Standings will update after each match' },
  };
  const { icon, title, sub } = msgs[tab] ?? msgs.Fixtures;
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

function TabBar({ active, onPress, liveCount, tabs, sportColor }: {
  active:      string;
  onPress:     (t: any) => void;
  liveCount:   number;
  tabs:        readonly string[];
  sportColor?: string;
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
      {tabs.map(t => {
        const isActive    = t === active;
        const isLiveTab   = t === 'Live';
        const activeColor = isLiveTab ? colors.live : (sportColor ?? colors.accent);

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
              color:         isActive ? activeColor : colors.textSecondary,
              fontSize:      font.xs,
              fontWeight:    '700',
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

// ── Football grouping helpers ─────────────────────────────────

interface FootballSection {
  title:   string;
  data:    FootballMatch[];
  isStage?: boolean;
}

const KNOCKOUT_STAGES = new Set([
  'Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', '3rd Place', 'Final',
]);

function footballGroupByDate(matches: FootballMatch[]): FootballSection[] {
  const map = new Map<string, FootballMatch[]>();
  for (const m of matches) {
    const key = dateLabel(m.date);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

function footballGroupByStageThenDate(matches: FootballMatch[]): FootballSection[] {
  const hasKnockout = matches.some(m => KNOCKOUT_STAGES.has(m.stage as string));
  if (!hasKnockout) return footballGroupByDate(matches);

  // Group stage: by date, knockout: by round
  const groupStage = matches.filter(m => m.stage === 'Group Stage');
  const knockout   = matches.filter(m => KNOCKOUT_STAGES.has(m.stage as string));

  const sections: FootballSection[] = [];
  if (groupStage.length > 0) sections.push(...footballGroupByDate(groupStage));

  const stageOrder = ['Round of 32', 'Round of 16', 'Quarter-Final', 'Semi-Final', '3rd Place', 'Final'];
  for (const stage of stageOrder) {
    const ms = knockout.filter(m => m.stage === stage);
    if (ms.length > 0) sections.push({ title: stage, data: ms, isStage: true });
  }

  return sections;
}

// ── Football: pre-tournament countdown card ───────────────────

const KICKOFF_DATE = new Date('2026-06-11T00:00:00Z');

function PreTournamentBanner() {
  const now       = new Date();
  const diffMs    = KICKOFF_DATE.getTime() - now.getTime();
  const diffDays  = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const diffHours = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

  const label = diffDays > 0
    ? `${diffDays}d ${diffHours}h to kickoff`
    : diffMs > 0 ? `${diffHours}h to kickoff` : 'Tournament underway';

  return (
    <View style={{
      backgroundColor: '#052e16',
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: '#166534',
      padding: spacing.xl,
      marginBottom: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    }}>
      <Text style={{ fontSize: 28 }}>⚽</Text>
      <Text style={{ color: '#4ade80', fontSize: font.xs, fontWeight: '800', letterSpacing: 2 }}>
        FIFA WORLD CUP 2026
      </Text>
      <Text style={{ color: '#bbf7d0', fontSize: font.lg, fontWeight: '800' }}>
        {label}
      </Text>
      <Text style={{ color: '#4ade80', fontSize: font.xs, opacity: 0.7, textAlign: 'center' }}>
        Fixtures load when the tournament begins · Jun 11 – Jul 19
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm }}>
        {[{ num: '48', label: 'Teams' }, { num: '12', label: 'Groups' }, { num: '104', label: 'Matches' }].map(item => (
          <View key={item.label} style={{ alignItems: 'center' }}>
            <Text style={{ color: '#4ade80', fontSize: font.xl, fontWeight: '900' }}>{item.num}</Text>
            <Text style={{ color: '#4ade80', fontSize: font.xs, opacity: 0.7 }}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Football matches screen ───────────────────────────────────

const FOOTBALL_GREEN = '#16A34A';

function FootballMatchesScreen() {
  const { league } = useLeague();
  const {
    liveMatches,
    upcomingMatches,
    completedMatches,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useFootballMatches();

  const { data: groups, isLoading: groupsLoading } = useWC2026Groups();

  // PredictX (AI) prediction correctness for completed matches
  const { data: tipMatches = [] } = useFootballTips();
  const predictionMap = useMemo(() => {
    const map = new Map<string, 'correct' | 'wrong'>();
    for (const tm of tipMatches) {
      if (!tm.tip?.winner) continue;
      const match = completedMatches.find(m => String(m.id) === String(tm.id));
      if (!match) continue;
      const result = resolveFootballPredictionResult(tm.tip.winner, match);
      if (result) map.set(String(tm.id), result);
    }
    return map;
  }, [tipMatches, completedMatches]);

  // Expert prediction correctness for completed matches
  const expertPredictions = useGlobalExpertPredictions();
  const expertPredictionMap = useMemo(() => {
    const map = new Map<string, 'correct' | 'wrong'>();
    for (const ep of expertPredictions) {
      if (!ep.match_id || !ep.predicted_winner) continue;
      const match = completedMatches.find(m => String(m.id) === String(ep.match_id));
      if (!match) continue;
      const result = resolveFootballPredictionResult(ep.predicted_winner, match);
      if (result) map.set(String(ep.match_id), result);
    }
    return map;
  }, [expertPredictions, completedMatches]);

  const liveCount       = liveMatches.length;
  const preTournament   = !isLoading && liveCount === 0 && upcomingMatches.length === 0 && completedMatches.length === 0;
  const leagueComplete  = !isLoading && liveCount === 0 && upcomingMatches.length === 0 && completedMatches.length > 0;

  const [tab, setTab] = useState<FootballTab>(() => (liveCount > 0 ? 'Live' : 'Groups'));

  useEffect(() => {
    if (leagueComplete) setTab('Results');
  }, [leagueComplete]);

  const fixturesSections = useMemo(
    () => footballGroupByStageThenDate(upcomingMatches),
    [upcomingMatches],
  );
  const resultsSections  = useMemo(
    () => footballGroupByStageThenDate([...completedMatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )),
    [completedMatches],
  );

  const groupEntries = useMemo(
    () => groups ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)) : [],
    [groups],
  );

  const preTournamentGroupEntries = groupEntries.every(
    ([, standings]) => standings.every(s => s.played === 0)
  );

  function renderListContent() {
    if (isLoading) return <LoadingState />;
    if (isError)   return <ErrorState onRetry={refetch} />;

    if (tab === 'Live') {
      if (liveCount === 0) return <EmptyState tab="Live" leagueShort={league.short} />;
      return (
        <View>
          {liveMatches.map(m => <FootballMatchCard key={m.id} match={m} />)}
        </View>
      );
    }

    if (tab === 'Fixtures') {
      if (fixturesSections.length === 0)
        return (
          <View>
            {preTournament && <PreTournamentBanner />}
            <EmptyState tab="Fixtures" leagueShort={league.short} />
          </View>
        );
      return (
        <View>
          {liveCount > 0 && (
            <Pressable onPress={() => setTab('Live')} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.lg })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: colors.live, padding: spacing.md, gap: spacing.md }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
                <Text style={{ flex: 1, color: colors.live, fontSize: font.xs, fontWeight: '700' }}>
                  {liveCount} match{liveCount > 1 ? 'es' : ''} in progress
                </Text>
                <Text style={{ color: FOOTBALL_GREEN, fontSize: font.xs, fontWeight: '600' }}>View Live →</Text>
              </View>
            </Pressable>
          )}
          {fixturesSections.map(section => (
            <View key={section.title}>
              {section.isStage
                ? <StageHeader stage={section.title} />
                : <DateGroupHeader label={section.title} />
              }
              {section.data.map(m => <FootballMatchCard key={m.id} match={m} />)}
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'Results') {
      if (resultsSections.length === 0)
        return <EmptyState tab="Results" leagueShort={league.short} />;
      return (
        <View>
          {resultsSections.map(section => (
            <View key={section.title}>
              {section.isStage
                ? <StageHeader stage={section.title} />
                : <DateGroupHeader label={section.title} />
              }
              {section.data.map(m => (
                <FootballMatchCard
                  key={m.id}
                  match={m}
                  predictionResult={predictionMap.get(String(m.id)) ?? null}
                  expertPredictionResult={expertPredictionMap.get(String(m.id)) ?? null}
                />
              ))}
            </View>
          ))}
        </View>
      );
    }

    if (tab === 'Groups') {
      if (groupsLoading) return <LoadingState />;
      if (!groups || groupEntries.length === 0)
        return <EmptyState tab="Groups" leagueShort={league.short} />;
      return (
        <View>
          {/* Qualification rule note */}
          <View style={{
            backgroundColor: '#f0fdf4', borderRadius: radius.md, padding: spacing.md,
            borderWidth: 1, borderColor: '#bbf7d0', marginBottom: spacing.lg,
            flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          }}>
            <Text style={{ fontSize: 14 }}>ℹ️</Text>
            <Text style={{ flex: 1, color: '#166534', fontSize: font.xs, lineHeight: 16 }}>
              Top 2 from each group advance. The 8 best 3rd-place teams also progress to the Round of 32.
            </Text>
          </View>

          {preTournamentGroupEntries && (
            <View style={{ backgroundColor: '#fef9c3', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#fde047', marginBottom: spacing.lg }}>
              <Text style={{ color: '#854d0e', fontSize: font.xs, fontWeight: '600', textAlign: 'center' }}>
                Standings will update live from Jun 11 · All teams shown pre-tournament
              </Text>
            </View>
          )}

          <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.lg }}>
            GROUP STAGE — 12 GROUPS · 48 TEAMS
          </Text>
          {groupEntries.map(([name, standings]) => (
            <GroupTable key={name} groupName={name} standings={standings} />
          ))}
        </View>
      );
    }

    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
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
              tintColor={FOOTBALL_GREEN}
              colors={[FOOTBALL_GREEN]}
              progressBackgroundColor={colors.card}
            />
          }
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 }}>
            <View>
              <Text style={{ color: FOOTBALL_GREEN, fontSize: font.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>
                {league.short} {league.season}
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>
                World Cup
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>
                Fixtures · Results · Groups
              </Text>
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

          <LeagueSwitcher style={{ marginTop: spacing.md }} />

          {/* Tab bar */}
          <TabBar
            active={tab}
            onPress={(t: FootballTab) => setTab(t)}
            liveCount={liveCount}
            tabs={FOOTBALL_TABS}
            sportColor={FOOTBALL_GREEN}
          />

          {/* Content */}
          {renderListContent()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Cricket matches screen ────────────────────────────────────

function CricketMatchesScreen() {
  const router = useRouter();
  const { league } = useLeague();

  const {
    liveMatches,
    upcomingMatches,
    completedMatches,
    isLoading,
    isError,
    isRefetching,
    refetch,
  } = useMatchCategories();

  // Auto-switch to Results when the league is over
  const leagueComplete = !isLoading && liveMatches.length === 0 && upcomingMatches.length === 0 && completedMatches.length > 0;
  const [tab, setTab] = useState<Tab>('Fixtures');
  // Switch default tab when leagueComplete becomes true
  const didAutoSwitch = useRef(false);
  useEffect(() => {
    if (leagueComplete && !didAutoSwitch.current) {
      didAutoSwitch.current = true;
      setTab('Results');
    }
    if (!leagueComplete) didAutoSwitch.current = false;
  }, [leagueComplete]);

  const { data: fixtures = [] }                             = useIPLFixtures();
  const { data: tableRows = [], isLoading: tableLoading }   = useIPLTable();
  const { getLiveScore, scores: wsScores, hasReceivedData: wsReady, lastUpdatedAt, scoreCount } = useLiveScores();

  // When live count drops to 0 (match just ended), refetch matches so Results tab updates
  const prevScoreCount = useRef(scoreCount);
  useEffect(() => {
    if (prevScoreCount.current > 0 && scoreCount === 0) {
      refetch();
    }
    prevScoreCount.current = scoreCount;
  }, [scoreCount, refetch]);

  // Tips — fetched per-league (genericTipsService covers every cricket league;
  // useTipsList already scopes the request via league.id, returns [] for football)
  const { data: tips = [] } = useTipsList();
  const predictionMap = useMemo(() => {
    const map = new Map<string, 'correct' | 'wrong'>();
    for (const t of tips) {
      if (!t.tip?.winner) continue;
      const match = completedMatches.find(m => String(m.id) === String(t.id));
      if (!match) continue;
      const result = resolvePredictionResult(t.tip.winner, match);
      if (result) map.set(String(t.id), result);
    }
    return map;
  }, [tips, completedMatches, league.id]);

  // Expert predictions — global across all leagues, real-time via Supabase
  const expertPredictions = useGlobalExpertPredictions();

  const expertPredictionMap = useMemo(() => {
    const map = new Map<string, 'correct' | 'wrong'>();
    for (const ep of expertPredictions) {
      if (!ep.match_id || !ep.predicted_winner) continue;
      const match = completedMatches.find(m => String(m.id) === String(ep.match_id));
      if (!match) continue;
      const result = resolvePredictionResult(ep.predicted_winner, match);
      if (result) map.set(String(ep.match_id), result);
    }
    return map;
  }, [expertPredictions, completedMatches]);

  // Fixtures: upcoming from API + future fixtures (deduped)
  const mergedUpcoming = useMemo(() => {
    const fixtureUpcoming = fixtures.filter(f => f.isUpcoming);
    return dedupeMatches([...upcomingMatches, ...fixtureUpcoming]);
  }, [upcomingMatches, fixtures]);

  // Effective live: use WS only after it has sent at least one broadcast.
  // Before that, REST is authoritative so a live match isn't missed during WS handshake.
  const effectiveLiveMatches = useMemo(() => {
    if (wsReady) {
      if (wsScores.size === 0) return []; // WS confirmed: nothing live
      const candidates = dedupeMatches([...liveMatches, ...upcomingMatches]);
      return candidates
        .map(m => {
          const ws = getLiveScore(m.team1Short, m.team2Short);
          return ws?.status === 'live' ? patchWithLive(m, getLiveScore) : null;
        })
        .filter((m): m is AdaptedMatch => m !== null);
    }
    // WS hasn't sent data yet — use REST
    return liveMatches;
  }, [liveMatches, upcomingMatches, getLiveScore, wsScores, wsReady]);

  const liveCount = effectiveLiveMatches.length;

  // Champion data for completed leagues
  const champData = useMemo(() => {
    if (!leagueComplete) return null;
    const finalMatch = completedMatches.find(m => m.matchStage === 'FINAL') ?? completedMatches[0];
    if (!finalMatch) return null;
    const winnerName = finalMatch.winner ?? '';
    const team1IsChamp = winnerName
      ? finalMatch.team1Name === winnerName
      : tableRows[0]?.teamShort === finalMatch.team1Short;
    return {
      champ:      team1IsChamp
        ? { name: finalMatch.team1Name, short: finalMatch.team1Short, logo: finalMatch.team1Logo }
        : { name: finalMatch.team2Name, short: finalMatch.team2Short, logo: finalMatch.team2Logo },
      runner:     team1IsChamp
        ? { name: finalMatch.team2Name, short: finalMatch.team2Short, logo: finalMatch.team2Logo }
        : { name: finalMatch.team1Name, short: finalMatch.team1Short, logo: finalMatch.team1Logo },
      finalResult: finalMatch.result ?? '',
    };
  }, [leagueComplete, completedMatches, tableRows]);

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
    <MatchCard
      match={patchWithLive(item, getLiveScore)}
      onPress={handleMatchPress}
      predictionResult={item.isCompleted ? (predictionMap.get(String(item.id)) ?? null) : null}
      expertPredictionResult={item.isCompleted ? (expertPredictionMap.get(String(item.id)) ?? null) : null}
    />
  ), [handleMatchPress, getLiveScore, predictionMap, expertPredictionMap]);

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <DateGroupHeader label={section.title} />
  ), []);

  // ── List header (app title + tab bar + tab-specific non-list content) ──

  const ListHeader = (
    <View>
      {/* App header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 2 }}>
        <View>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>{league.short} {league.season}</Text>
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

      <LeagueSwitcher style={{ marginTop: spacing.md }} />

      {/* Tab bar */}
      <TabBar active={tab} onPress={setTab} liveCount={liveCount} tabs={TABS} />

      {/* Loading / Error */}
      {isLoading && <LoadingState />}
      {isError   && <ErrorState onRetry={refetch} />}

      {/* ── Live tab content (not list-based) ── */}
      {tab === 'Live' && !isLoading && !isError && (
        liveCount === 0
          ? <EmptyState tab="Live" leagueShort={league.short} />
          : effectiveLiveMatches.map(m => (
              <LiveHeroCard
                key={m.id}
                match={patchWithLive(m, getLiveScore)}
                onPress={() => handleMatchPress(m.id)}
                lastUpdatedAt={lastUpdatedAt}
              />
            ))
      )}

      {/* ── Fixtures tab: champion banner (complete) OR live banner + upcoming ── */}
      {tab === 'Fixtures' && !isLoading && !isError && (
        <>
          {leagueComplete && champData ? (
            <ChampionBanner
              champ={champData.champ}
              runner={champData.runner}
              finalResult={champData.finalResult}
              leagueName={`${league.name} ${league.season}`}
            />
          ) : (
            <>
              {liveCount > 0 && (
                <LiveBanner match={effectiveLiveMatches[0]} onPress={() => setTab('Live')} />
              )}
              {fixturesSections.length === 0 && <EmptyState tab="Fixtures" leagueShort={league.short} />}
            </>
          )}
        </>
      )}

      {/* ── Results tab: empty state only (list handles cards) ── */}
      {tab === 'Results' && !isLoading && !isError && resultsSections.length === 0 && (
        <EmptyState tab="Results" leagueShort={league.short} />
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

// ── Main screen ───────────────────────────────────────────────

export default function MatchesScreen() {
  const isFootball = useIsFootball();
  return (
    <LeaguePickerGate>
      {isFootball ? <FootballMatchesScreen /> : <CricketMatchesScreen />}
    </LeaguePickerGate>
  );
}
