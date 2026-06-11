import {
  View, Text, ScrollView, Pressable, Image,
  RefreshControl, Animated,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { NewsCardSkeleton, StandingRowSkeleton, RankingRowSkeleton } from '@/components/Skeleton';
import { API_BASE_URL } from '@/config/api';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLiveScores } from '@/hooks/useLiveScores';
import { useMatchCategories, useIPLTable, useLeagueFixtures } from '@/hooks/useMatches';
import { useHomeRankings, useHomeNews, useSeasonStats, type RankingPlayer, type RankingTeam, type NewsItem, type ToplistPlayer } from '@/hooks/useHome';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import { dedupeMatches } from '@/utils/matchAdapter';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import type { StandingsRow } from '@/services/matchService';
import { useLeague, useIsFootball } from '@/contexts/LeagueContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { useFootballMatches }   from '@/hooks/useFootballMatches';
import { useFootballTips }      from '@/hooks/useFootballTips';
import { useWC2026Groups }      from '@/hooks/useWC2026Groups';
import { useWCHistoryStats }    from '@/hooks/useWCHistoryStats';
import type { WCTeamLegend, WCPenaltyRecord, WCRivalry } from '@/types/football';
import { FootballMatchCard }  from '@/components/FootballMatchCard';
import { GroupTable }         from '@/components/GroupTable';
import { LeagueSheet } from '@/components/LeagueSheet';
import { SideDrawer } from '@/components/SideDrawer';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTipsList } from '@/hooks/useTips';
import type { LiveScore as LiveScoreData } from '@/hooks/useLiveScores';
import type { MatchWithTip } from '@/services/tipsService';

// ── Helpers ───────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10); }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function trendIcon(trend: string) {
  if (trend === 'Up')   return { name: 'arrow-up'  as const, color: colors.success };
  if (trend === 'Down') return { name: 'arrow-down' as const, color: colors.live };
  return                       { name: 'remove'     as const, color: colors.textMuted };
}

// ── SectionHeader ─────────────────────────────────────────────

function SectionHeader({ title, accent, onMore, moreLabel }: {
  title: string; accent?: string; onMore?: () => void; moreLabel?: string;
}) {
  const c = accent || colors.accent;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: c }} />
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>{title}</Text>
      </View>
      {onMore && (
        <Pressable onPress={onMore} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 3 })}>
          <Text style={{ color: c, fontSize: font.sm, fontWeight: '600' }}>{moreLabel || 'See all'}</Text>
          <Ionicons name="chevron-forward" size={12} color={c} />
        </Pressable>
      )}
    </View>
  );
}

// ── Team Logo helper ──────────────────────────────────────────

function TeamLogo({ logoUri, shortName, size }: { logoUri: string; shortName: string; size: number }) {
  const color = getTeamColor(shortName);
  if (logoUri) return <Image source={{ uri: logoUri }} style={{ width: size, height: size }} resizeMode="contain" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.32, fontWeight: '900' }}>{shortName}</Text>
    </View>
  );
}

// ── LiveMatchCard ─────────────────────────────────────────────

function LiveMatchCard({ match, onPress, lastUpdatedAt = 0, expertPick, aiPick, liveScore }: {
  match: AdaptedMatch;
  onPress: () => void;
  lastUpdatedAt?: number;
  expertPick?: string | null;
  aiPick?: string | null;
  liveScore?: LiveScoreData | null;
}) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.2, duration: 650, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 650, useNativeDriver: true }),
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

  const updatedLabel = !lastUpdatedAt ? 'Connecting...' : secAgo < 5 ? 'Just now' : secAgo < 60 ? `${secAgo}s ago` : `${Math.floor(secAgo / 60)}m ago`;
  const updatedColor = !lastUpdatedAt ? colors.textMuted : secAgo < 15 ? colors.success : secAgo < 35 ? colors.accent : colors.live;

  const hasPredictions = expertPick || aiPick;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, marginBottom: spacing.xl })}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius:    radius.xl,
          borderWidth:     1,
          borderColor:     '#FECACA',
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

        <View style={{ padding: spacing.lg }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Animated.View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.live, opacity: pulseAnim }} />
              <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.8 }}>LIVE</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '500' }}>{match.matchDesc}</Text>
              {updatedLabel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="sync-outline" size={9} color={updatedColor} />
                  <Text style={{ color: updatedColor, fontSize: 9, fontWeight: '600' }}>{updatedLabel}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Scorecard */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c1 + '12', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo1} shortName={match.team1Short} size={40} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{match.team1Short}</Text>
              {match.score1
                ? <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 28 }}>{match.score1}</Text>
                : <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 4 }}>Yet to bat</Text>}
              {match.overs1 ? <Text style={{ color: colors.textMuted, fontSize: 10 }}>{match.overs1} ov</Text> : null}
            </View>

            <View style={{ width: 1, height: 64, backgroundColor: colors.border, marginHorizontal: spacing.sm }} />

            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c2 + '12', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo2} shortName={match.team2Short} size={40} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{match.team2Short}</Text>
              {match.score2
                ? <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, lineHeight: 28 }}>{match.score2}</Text>
                : <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 4 }}>Yet to bat</Text>}
              {match.overs2 ? <Text style={{ color: colors.textMuted, fontSize: 10 }}>{match.overs2} ov</Text> : null}
            </View>
          </View>

          {/* Status */}
          {match.statusText ? (
            <View style={{ marginTop: spacing.md, backgroundColor: colors.liveDim, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.live + '20' }}>
              <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>{match.statusText}</Text>
            </View>
          ) : null}

          {/* Bowling + batting row */}
          {(liveScore?.bowlers?.length || liveScore?.batsmen?.length) ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              {liveScore?.bowlers?.length ? (
                <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                    {match.team1Short} BOWLING
                  </Text>
                  {liveScore.bowlers.map((b, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: i < liveScore.bowlers!.length - 1 ? 2 : 0 }}>
                      {b.active && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.live }} />}
                      <Text style={{ flex: 1, color: b.active ? colors.textPrimary : colors.textSecondary, fontSize: 10, fontWeight: b.active ? '700' : '400' }} numberOfLines={1}>{b.name}</Text>
                      <Text style={{ color: b.wickets > 0 ? colors.accent : colors.textMuted, fontSize: 10, fontWeight: '700' }}>{b.wickets}/{b.runs}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}> ({b.overs})</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {liveScore?.batsmen?.length ? (
                <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: 8, fontWeight: '700', letterSpacing: 0.8, marginBottom: 4 }}>
                    {match.team2Short} BATTING
                  </Text>
                  {liveScore.batsmen.map((b, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: i < liveScore.batsmen!.length - 1 ? 2 : 0 }}>
                      <Text style={{ flex: 1, color: b.isStrike ? colors.textPrimary : colors.textSecondary, fontSize: 10, fontWeight: b.isStrike ? '700' : '400' }} numberOfLines={1}>{b.name}</Text>
                      <Text style={{ color: b.isStrike ? colors.live : colors.textPrimary, fontSize: 10, fontWeight: '700' }}>{b.runs}*</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}> ({b.balls})</Text>
                      {b.isStrike && <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.live }} />}
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Prediction chips */}
          {hasPredictions && (
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <View style={{ flex: 1, backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="person-outline" size={10} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 }}>EXPERT PICK</Text>
                </View>
                <Text style={{ color: expertPick ? colors.textPrimary : colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                  {expertPick ?? '—'}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.accentDim, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.accent + '25', alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="flash-outline" size={10} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 8, fontWeight: '700', letterSpacing: 0.5 }}>AI PICK</Text>
                </View>
                <Text style={{ color: aiPick ? colors.accent : colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
                  {aiPick ?? '—'}
                </Text>
              </View>
            </View>
          )}

          {/* Venue */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, gap: 4 }}>
            <Ionicons name="location-outline" size={10} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: 10 }} numberOfLines={1}>{match.venue}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── NextMatchCard ─────────────────────────────────────────────

function NextMatchCard({ match, onPress, onPredictionPress }: { match: AdaptedMatch; onPress: () => void; onPredictionPress: () => void }) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  // Format date nicely: "Wed, Apr 9"
  const dateLabel = match.date
    ? new Date(match.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.93 : 1, marginBottom: spacing.xl })}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius:    radius.xl,
          borderWidth:     1,
          borderColor:     colors.border,
          overflow:        'hidden',
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 2 },
          shadowOpacity:   0.07,
          shadowRadius:    8,
          elevation:       3,
        }}
      >
        {/* Upcoming accent bar */}
        <View style={{ height: 3, backgroundColor: colors.warning }} />

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 0 }}>

          {/* Row 1: status + match label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.warningDim, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.warning + '35' }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.warning }} />
              <Text style={{ color: colors.warning, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>UPCOMING</Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '500' }}>{match.matchDesc}</Text>
          </View>

          {/* Row 2: Team1 — Centre — Team2 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>

            {/* Team 1 */}
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c1 + '12', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo1} shortName={match.team1Short} size={52} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>{match.team1Short}</Text>
            </View>

            {/* Centre block */}
            <View style={{ alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600', letterSpacing: 1 }}>vs</Text>
              {dateLabel ? (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{dateLabel}</Text>
              ) : null}
              <View style={{ backgroundColor: colors.accentDim, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.accent + '30', alignItems: 'center' }}>
                <Text style={{ color: colors.accent, fontSize: font.lg, fontWeight: '800' }}>{match.time}</Text>
              </View>
            </View>

            {/* Team 2 */}
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c2 + '12', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo2} shortName={match.team2Short} size={52} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>{match.team2Short}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: -spacing.xl }} />

          {/* Row 3: venue + CTA */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm }}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
              {match.venue}
            </Text>
            <Pressable
              onPress={onPredictionPress}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: colors.accent,
                borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
              })}
            >
              <Ionicons name="flash-outline" size={11} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: font.xs, fontWeight: '700' }}>Prediction</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Pressable>
  );
}

// ── TournamentStrip ───────────────────────────────────────────

function TournamentStrip({
  rows, totalFixtures, completedFixtures,
}: {
  rows: StandingsRow[];
  totalFixtures: number;
  completedFixtures: number;
}) {
  if (!rows.length) return null;
  const leader = rows[0];
  // Prefer fixture-count data; fall back to summing standings
  const played = completedFixtures > 0
    ? completedFixtures
    : Math.round(rows.reduce((s, r) => s + (r.played ?? 0), 0) / 2);
  const total  = totalFixtures > 0 ? totalFixtures : Math.max(played * 2, 1);
  const pct    = Math.min(100, Math.round((played / total) * 100));
  const lColor   = getTeamColor(leader.teamShort);
  const lLogo    = getTeamLogo(leader.logo ?? '', leader.teamShort);

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {/* Tournament progress */}
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>TOURNAMENT</Text>
          <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: 6 }}>{pct}%</Text>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%` as any, height: 4, backgroundColor: colors.accent, borderRadius: 2 }} />
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 5 }}>{played} of {total} matches</Text>
        </View>

        {/* Leader */}
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: lColor + '35', alignItems: 'center', gap: 4 }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>LEADING</Text>
          {lLogo
            ? <Image source={{ uri: lLogo }} style={{ width: 36, height: 36 }} resizeMode="contain" />
            : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: lColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: lColor, fontSize: 10, fontWeight: '900' }}>{leader.teamShort}</Text>
              </View>
          }
          <Text style={{ color: lColor, fontSize: font.md, fontWeight: '800' }}>{leader.teamShort}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>{leader.points} pts</Text>
        </View>

        {/* Playoff spots */}
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>PLAYOFFS</Text>
          <Text style={{ color: colors.success, fontSize: font.xl, fontWeight: '800', marginBottom: 4 }}>Top 4</Text>
          {rows.slice(0, 4).map((r, i) => {
            const c = getTeamColor(r.teamShort);
            return (
              <View key={r.teamShort} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c }} />
                <Text style={{ color: colors.textSecondary, fontSize: 9, fontWeight: '600' }}>{r.teamShort}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// ── Quick Actions ─────────────────────────────────────────────

function QuickActions({ onFixtures, onTips, onStandings, onExpert }: { onFixtures: () => void; onTips: () => void; onStandings: () => void; onExpert: () => void }) {
  const actions = [
    { icon: 'calendar-outline' as const,  label: 'Schedule',      onPress: onFixtures,   color: '#60A5FA' },
    { icon: 'analytics-outline' as const, label: 'PredictX',      onPress: onTips,       color: colors.accent },
    { icon: 'person-outline' as const,    label: 'Our Experts',   onPress: onExpert,     color: '#a78bfa' },
    { icon: 'trophy-outline' as const,    label: 'Standings',     onPress: onStandings,  color: colors.success },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
      {actions.map(a => (
        <Pressable
          key={a.label}
          onPress={a.onPress}
          style={({ pressed }) => ({
            flex: 1, opacity: pressed ? 0.7 : 1,
            backgroundColor: colors.card,
            borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
            paddingVertical: 14, alignItems: 'center', gap: 6,
          })}
        >
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: a.color + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: a.color + '30' }}>
            <Ionicons name={a.icon} size={17} color={a.color} />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' }}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ── InternationalBanner (entry point to bilateral series section) ─

function InternationalBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.xl })}
    >
      <LinearGradient
        colors={['#1E3A8A', '#2563EB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.lg,
          padding: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 12,
          backgroundColor: 'rgba(255,255,255,0.15)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name="globe-outline" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: font.base, fontWeight: '800' }}>International Cricket</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: font.xs, marginTop: 2 }}>
            Bilateral T20I tours · live series, fixtures & predictions
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
      </LinearGradient>
    </Pressable>
  );
}

// ── UpcomingMatchRow (compact, for list) ──────────────────────

function UpcomingMatchRow({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
        {/* Left color bar */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg, backgroundColor: c1 }} />

        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
          <TeamLogo logoUri={logo1} shortName={match.team1Short} size={32} />
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', flex: 1 }}>
            {match.team1Short} <Text style={{ color: colors.textMuted, fontWeight: '500' }}>vs</Text> {match.team2Short}
          </Text>
          <TeamLogo logoUri={logo2} shortName={match.team2Short} size={32} />
        </View>

        <View style={{ alignItems: 'flex-end', gap: 3, marginLeft: spacing.md }}>
          <View style={{ backgroundColor: colors.accent + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.accent + '30' }}>
            <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '700' }}>{match.time}</Text>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 9 }} numberOfLines={1}>{match.venue?.split(',')[0]}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── NewsCard ──────────────────────────────────────────────────

function NewsCard({ item, onPress, featured }: { item: NewsItem; onPress: () => void; featured?: boolean }) {
  const imgUri = item.image
    ? item.image.startsWith('/') ? API_BASE_URL.replace('/api', '') + item.image : item.image
    : null;

  if (featured && imgUri) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginBottom: spacing.md })}>
        <View style={{ borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <ExpoImage
            source={{ uri: imgUri }}
            style={{ width: '100%', height: 190 }}
            contentFit="cover"
            cachePolicy="disk"
            transition={300}
            placeholder={{ color: colors.cardElevated }}
          />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.82)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg }}>
            {item.storyType && (
              <View style={{ backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>{item.storyType.toUpperCase()}</Text>
              </View>
            )}
            <Text style={{ color: '#FFFFFF', fontSize: font.md, fontWeight: '700', lineHeight: 20 }} numberOfLines={2}>{item.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: font.xs, marginTop: 4 }}>{item.context || item.source} · Cricbuzz</Text>
          </LinearGradient>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm, flexDirection: 'row' }}>
        {imgUri
          ? <ExpoImage
              source={{ uri: imgUri }}
              style={{ width: 90, height: 88 }}
              contentFit="cover"
              cachePolicy="disk"
              transition={250}
              placeholder={{ color: colors.cardElevated }}
            />
          : <View style={{ width: 90, height: 88, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name="cricket" size={24} color={colors.textMuted} />
            </View>
        }
        <View style={{ flex: 1, padding: spacing.md, justifyContent: 'space-between' }}>
          {item.storyType && (
            <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 }}>{item.storyType.toUpperCase()}</Text>
          )}
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600', lineHeight: 17 }} numberOfLines={3}>{item.title}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 4 }}>{item.context || item.source}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── MiniTable ─────────────────────────────────────────────────

function MiniTable({ rows }: { rows: StandingsRow[] }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: 9, backgroundColor: colors.cardElevated, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(['#', 'TEAM', 'M', 'W', 'PTS'] as const).map((h, i) => (
          <Text key={h} style={{ flex: i === 1 ? 3 : 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: i > 1 ? 'center' : 'left', letterSpacing: 0.5 }}>{h}</Text>
        ))}
      </View>
      {rows.slice(0, 5).map((row, idx) => {
        const teamColor = getTeamColor(row.teamShort);
        const isTop4    = idx < 4;
        return (
          <View key={row.teamShort} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: idx < 4 ? 1 : 0, borderBottomColor: colors.border, backgroundColor: idx === 0 ? teamColor + '08' : 'transparent' }}>
            <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: isTop4 ? colors.success + '60' : 'transparent' }} />
            <Text style={{ flex: 1, color: isTop4 ? colors.success : colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>{idx + 1}</Text>
            <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {row.logo
                ? <Image source={{ uri: row.logo }} style={{ width: 22, height: 22 }} resizeMode="contain" />
                : <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: teamColor + '25', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: teamColor, fontSize: 8, fontWeight: '800' }}>{row.teamShort.slice(0, 2)}</Text>
                  </View>
              }
              <Text style={{ color: isTop4 ? colors.textPrimary : colors.textSecondary, fontSize: font.xs, fontWeight: isTop4 ? '700' : '500' }}>{row.teamShort}</Text>
            </View>
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>{row.played}</Text>
            <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>{row.wins}</Text>
            <Text style={{ flex: 1, color: colors.accent, fontSize: font.xs, fontWeight: '800', textAlign: 'center' }}>{row.points}</Text>
          </View>
        );
      })}
      {/* Qualification note */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 8, gap: 6, backgroundColor: colors.cardElevated, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success + '80' }} />
        <Text style={{ color: colors.textMuted, fontSize: 9 }}>Playoff qualification zone</Text>
      </View>
    </View>
  );
}

// ── TeamRankingsWidget ────────────────────────────────────────
// Home screen ICC team rankings — T20I / ODI / Test from Sportsmonks.

function TeamRankingsWidget({ teams, loading }: { teams: RankingTeam[]; loading: boolean }) {
  if (loading) {
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {[0,1,2,3,4].map(i => <RankingRowSkeleton key={i} />)}
      </View>
    );
  }

  if (teams.length === 0) {
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: spacing.sm }}>
        <Ionicons name="trophy-outline" size={28} color={colors.textMuted} />
        <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600', textAlign: 'center' }}>Rankings temporarily unavailable</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>Data will appear once the API quota resets</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {/* Column headers */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.cardElevated }}>
        <Text style={{ width: 28, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>#</Text>
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>TEAM</Text>
        <Text style={{ width: 44, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'right' }}>RTG</Text>
        <Text style={{ width: 40, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'right' }}>PTS</Text>
      </View>

      {teams.slice(0, 8).map((t, idx) => (
        <View
          key={t.id || idx}
          style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: spacing.md, paddingVertical: 11,
            borderBottomWidth: idx < 7 ? 1 : 0, borderBottomColor: colors.borderLight,
            backgroundColor: idx % 2 === 1 ? colors.borderLight : colors.card,
          }}
        >
          <Text style={{ width: 28, color: idx < 3 ? colors.accent : colors.textMuted, fontSize: font.sm, fontWeight: idx < 3 ? '800' : '600' }}>
            {t.rank || idx + 1}
          </Text>

          {t.image ? (
            <Image source={{ uri: t.image }} style={{ width: 26, height: 26, marginRight: spacing.sm }} resizeMode="contain" />
          ) : (
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentDim, marginRight: spacing.sm, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.accent, fontSize: 8, fontWeight: '700' }}>{(t.code || t.name || '?').slice(0, 3)}</Text>
            </View>
          )}

          <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm, fontWeight: idx < 3 ? '700' : '500' }} numberOfLines={1}>
            {t.name}
          </Text>
          <Text style={{ width: 44, color: colors.textSecondary, fontSize: font.sm, fontWeight: '600', textAlign: 'right' }}>{t.rating}</Text>
          <Text style={{ width: 40, color: colors.accent, fontSize: font.sm, fontWeight: '700', textAlign: 'right' }}>{t.points}</Text>
        </View>
      ))}
    </View>
  );
}

// ── RecentResultRow ───────────────────────────────────────────

function RecentResultRow({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);
  const winShort = match.winner && match.winner !== 'No Result'
    ? (match.team1Name === match.winner ? match.team1Short : match.team2Short)
    : null;
  const isNR = !match.winner || match.winner === 'No Result' || /no result|abandoned/i.test(match.result ?? '');

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TeamLogo logoUri={logo1} shortName={match.team1Short} size={28} />
            <Text style={{ color: winShort === match.team1Short ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: winShort === match.team1Short ? '800' : '500' }}>{match.team1Short}</Text>
            {match.score1 ? <Text style={{ color: winShort === match.team1Short ? colors.accent : colors.textMuted, fontSize: font.xs }}>{match.score1}</Text> : null}
          </View>

          {isNR
            ? <View style={{ backgroundColor: colors.cardElevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700' }}>N/R</Text>
              </View>
            : <View style={{ backgroundColor: colors.success + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: colors.success + '30' }}>
                <Text style={{ color: colors.success, fontSize: 9, fontWeight: '700' }}>FT</Text>
              </View>
          }

          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            {match.score2 ? <Text style={{ color: winShort === match.team2Short ? colors.accent : colors.textMuted, fontSize: font.xs }}>{match.score2}</Text> : null}
            <Text style={{ color: winShort === match.team2Short ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: winShort === match.team2Short ? '800' : '500' }}>{match.team2Short}</Text>
            <TeamLogo logoUri={logo2} shortName={match.team2Short} size={28} />
          </View>
        </View>
        {match.result && (
          <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{match.result}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── TeamFormSection ───────────────────────────────────────────

interface TeamFormRow { teamShort: string; teamLogo: string; form: Array<'W' | 'L' | 'NR'>; }

function buildTeamForm(completed: AdaptedMatch[]): TeamFormRow[] {
  const history = new Map<string, { logo: string; form: Array<'W' | 'L' | 'NR'> }>();
  const sorted  = [...completed].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const m of sorted) {
    if (!history.has(m.team1Short)) history.set(m.team1Short, { logo: m.team1Logo, form: [] });
    if (!history.has(m.team2Short)) history.set(m.team2Short, { logo: m.team2Logo, form: [] });
    const t1 = history.get(m.team1Short)!;
    const t2 = history.get(m.team2Short)!;
    if (!m.winner || m.winner === 'No Result') { t1.form.push('NR'); t2.form.push('NR'); }
    else if (m.winner === m.team1Name)          { t1.form.push('W');  t2.form.push('L'); }
    else if (m.winner === m.team2Name)          { t1.form.push('L');  t2.form.push('W'); }
    else                                        { t1.form.push('NR'); t2.form.push('NR'); }
  }

  return Array.from(history.entries())
    .map(([teamShort, d]) => ({ teamShort, teamLogo: d.logo, form: d.form.slice(-5) }))
    .filter(r => r.form.length > 0)
    .sort((a, b) => b.form.filter(f => f === 'W').length - a.form.filter(f => f === 'W').length);
}

function TeamFormSection({ completed }: { completed: AdaptedMatch[] }) {
  const rows = buildTeamForm(completed);
  if (rows.length === 0) return null;
  const dotColor = { W: colors.success, L: colors.live, NR: colors.textMuted };

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {rows.map((r, idx) => {
        const tColor = getTeamColor(r.teamShort);
        const tLogo  = getTeamLogo(r.teamLogo, r.teamShort);
        const wins   = r.form.filter(f => f === 'W').length;
        return (
          <View key={r.teamShort} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: idx < rows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            {tLogo
              ? <Image source={{ uri: tLogo }} style={{ width: 26, height: 26, marginRight: spacing.sm }} resizeMode="contain" />
              : <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tColor + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                  <Text style={{ color: tColor, fontSize: 8, fontWeight: '900' }}>{r.teamShort.slice(0, 2)}</Text>
                </View>
            }
            <Text style={{ color: colors.textPrimary, fontSize: font.xs, fontWeight: '700', width: 40 }}>{r.teamShort}</Text>
            <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}>
              {r.form.map((result, i) => (
                <View key={i} style={{ width: 22, height: 22, borderRadius: 5, backgroundColor: dotColor[result] + '20', borderWidth: 1, borderColor: dotColor[result] + '50', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: dotColor[result], fontSize: 8, fontWeight: '900' }}>{result}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color: wins >= 3 ? colors.success : colors.textMuted, fontSize: font.xs, fontWeight: '700', marginLeft: spacing.sm }}>{wins}W</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── CapLeaderboard ────────────────────────────────────────────

function CapLeaderboard({ orangeCap, purpleCap, sixHitters }: {
  orangeCap:  ToplistPlayer[];
  purpleCap:  ToplistPlayer[];
  sixHitters: ToplistPlayer[];
}) {
  const [tab, setTab] = useState<'orange' | 'purple' | 'sixes'>('orange');

  const tabs: Array<{ key: 'orange' | 'purple' | 'sixes'; emoji: string; label: string; color: string }> = [
    { key: 'orange', emoji: '🟠', label: 'Orange Cap', color: '#F97316' },
    { key: 'purple', emoji: '🟣', label: 'Purple Cap', color: '#A855F7' },
    { key: 'sixes',  emoji: '⚡', label: 'Top Sixes',  color: '#60A5FA' },
  ];

  const players   = tab === 'orange' ? orangeCap : tab === 'purple' ? purpleCap : sixHitters;
  const capColor  = tabs.find(t => t.key === tab)!.color;
  const statKey   = tab === 'orange' ? 'runs' : tab === 'purple' ? 'wickets' : 'sixes';
  const statLabel = tab === 'orange' ? 'Runs' : tab === 'purple' ? 'Wkts' : 'Sixes';

  return (
    <View>
      <View style={{ flexDirection: 'row', backgroundColor: colors.cardElevated, borderRadius: radius.md, padding: 3, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
        {tabs.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 8, borderRadius: radius.sm - 2, backgroundColor: tab === t.key ? colors.card : 'transparent', alignItems: 'center' }}>
            <Text style={{ color: tab === t.key ? t.color : colors.textMuted, fontSize: 10, fontWeight: tab === t.key ? '800' : '500' }}>{t.emoji} {t.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {players.length === 0 ? (
          <View style={{ padding: spacing.xl, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Stats updating…</Text>
          </View>
        ) : players.map((p, idx) => {
          const tColor = getTeamColor(p.teamShort);
          return (
            <View key={p.playerId + idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: idx < players.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
              <Text style={{ color: idx < 3 ? capColor : colors.textMuted, fontSize: font.xs, fontWeight: '800', width: 18, textAlign: 'center', marginRight: 6 }}>{idx + 1}</Text>
              {p.imageUrl
                ? <Image source={{ uri: p.imageUrl }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: spacing.sm, backgroundColor: colors.cardElevated }} />
                : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tColor + '20', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}>
                    <Text style={{ color: tColor, fontSize: 10, fontWeight: '900' }}>{(p.teamShort || p.teamName).slice(0, 2)}</Text>
                  </View>
              }
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: tColor }} />
                  <Text style={{ color: colors.textMuted, fontSize: 9 }}>{p.teamShort || p.teamName}</Text>
                </View>
              </View>
              <Text style={{ color: idx === 0 ? capColor : colors.textPrimary, fontSize: font.base, fontWeight: '900' }}>
                {(p as any)[statKey] ?? '–'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 9, marginLeft: 4, width: 28 }}>{statLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── ExpertPickCard ────────────────────────────────────────────

function ExpertPickCard({ prediction, onPress }: { prediction: { id: string; match_id: string | null; match_label: string | null; predicted_winner: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; analysis: string }; onPress: () => void }) {
  const confColors = { HIGH: '#16a34a', MEDIUM: '#F59E0B', LOW: '#94A3B8' } as const;
  const c = confColors[prediction.confidence];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="person" size={12} color="#a78bfa" />
            <Text style={{ color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>EXPERT PICK</Text>
          </View>
          <View style={{ backgroundColor: c + '20', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: c + '40' }}>
            <Text style={{ color: c, fontSize: 9, fontWeight: '800' }}>{prediction.confidence}</Text>
          </View>
        </View>
        {prediction.match_label ? (
          <Text style={{ color: colors.textMuted, fontSize: 10, marginBottom: 6 }}>⚔️ {prediction.match_label}</Text>
        ) : null}
        <Text style={{ color: colors.warning, fontSize: 18, fontWeight: '900', marginBottom: spacing.sm }}>🏆 {prediction.predicted_winner}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: font.xs, lineHeight: 18 }} numberOfLines={3}>{prediction.analysis}</Text>
      </View>
    </Pressable>
  );
}

// ── AIPickRow ─────────────────────────────────────────────────

function AIPickRow({ match, onPress }: { match: MatchWithTip; onPress: () => void }) {
  const tip = match.tip;
  if (!tip) return null;
  const t1    = (match as any).team1 as { name: string; shortName: string; logo: string } | undefined;
  const t2    = (match as any).team2 as { name: string; shortName: string; logo: string } | undefined;
  const s1    = t1?.shortName ?? '';
  const s2    = t2?.shortName ?? '';
  const logo1 = getTeamLogo(t1?.logo ?? '', s1);
  const logo2 = getTeamLogo(t2?.logo ?? '', s2);
  const winPct = tip.team1Pct >= tip.team2Pct ? tip.team1Pct : tip.team2Pct;
  const confColor = tip.confidenceLabel === 'HIGH' ? colors.success : tip.confidenceLabel === 'MEDIUM' ? colors.accent : colors.textMuted;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        {logo1 ? <Image source={{ uri: logo1 }} style={{ width: 28, height: 28 }} resizeMode="contain" /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: getTeamColor(s1) + '20', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: getTeamColor(s1), fontSize: 8, fontWeight: '900' }}>{s1.slice(0,3)}</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 10 }} numberOfLines={1}>{s1} vs {s2}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Ionicons name="flash" size={10} color={colors.accent} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{tip.winner}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          <Text style={{ color: confColor, fontSize: font.md, fontWeight: '900' }}>{Math.round(winPct)}%</Text>
          <View style={{ backgroundColor: confColor + '15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ color: confColor, fontSize: 8, fontWeight: '700' }}>{tip.confidenceLabel}</Text>
          </View>
        </View>
        {logo2 ? <Image source={{ uri: logo2 }} style={{ width: 28, height: 28 }} resizeMode="contain" /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: getTeamColor(s2) + '20', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: getTeamColor(s2), fontSize: 8, fontWeight: '900' }}>{s2.slice(0,3)}</Text></View>}
      </View>
    </Pressable>
  );
}

// ── SeasonCompleteCard ────────────────────────────────────────

function TeamAvatar({ logo, short, size }: { logo: string; short: string; size: number }) {
  const url   = getTeamLogo(logo, short);
  const color = getTeamColor(short);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.28, fontWeight: '900' }}>{short.slice(0, 3)}</Text>
    </View>
  );
}

function SeasonCompleteCard({
  champ, runner, finalResult, leagueName, onViewResults,
}: {
  champ:        { name: string; short: string; logo: string };
  runner:       { name: string; short: string; logo: string };
  finalResult:  string;
  leagueName:   string;
  onViewResults: () => void;
}) {
  const champColor  = getTeamColor(champ.short);
  const runnerColor = getTeamColor(runner.short);
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: '#FDE68A', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}>
        {/* Gold accent bar */}
        <View style={{ height: 2, backgroundColor: '#F59E0B', opacity: 0.75 }} />
        <View style={{ padding: spacing.xl }}>
          {/* Badge */}
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B14', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: '#F59E0B35', marginBottom: 8 }}>
              <Ionicons name="trophy" size={13} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: font.xs, fontWeight: '900', letterSpacing: 1.5 }}>SEASON COMPLETE</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>{leagueName}</Text>
          </View>

          {/* Champion | Runner-up */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>
            {/* Champion */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: champColor + '18', borderWidth: 2.5, borderColor: '#F59E0B55', alignItems: 'center', justifyContent: 'center' }}>
                <TeamAvatar logo={champ.logo} short={champ.short} size={58} />
              </View>
              <View style={{ backgroundColor: '#F59E0B14', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#F59E0B30' }}>
                <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: '900', letterSpacing: 1 }}>🏆 CHAMPIONS</Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800', textAlign: 'center' }}>{champ.short}</Text>
            </View>

            {/* Divider */}
            <View style={{ alignItems: 'center', gap: 4, paddingHorizontal: spacing.md }}>
              <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>VS</Text>
              <View style={{ width: 1, height: 36, backgroundColor: colors.border }} />
            </View>

            {/* Runner-up */}
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: runnerColor + '12', borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <TeamAvatar logo={runner.logo} short={runner.short} size={46} />
              </View>
              <View style={{ backgroundColor: colors.cardElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>🥈 RUNNERS-UP</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }}>{runner.short}</Text>
            </View>
          </View>

          {/* Final result text */}
          {!!finalResult && (
            <View style={{ backgroundColor: colors.cardElevated, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, textAlign: 'center', lineHeight: 18 }}>{finalResult}</Text>
            </View>
          )}

          {/* CTA */}
          <Pressable
            onPress={onViewResults}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: '#F59E0B12', borderRadius: radius.md,
              paddingVertical: spacing.md, borderWidth: 1, borderColor: '#F59E0B35',
            })}
          >
            <Text style={{ color: '#F59E0B', fontSize: font.sm, fontWeight: '800' }}>View All Results</Text>
            <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── KeyResultsSection ─────────────────────────────────────────

function KeyResultRow({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  const c1   = getTeamColor(match.team1Short);
  const c2   = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);
  const winShort = match.winner
    ? (match.team1Name === match.winner ? match.team1Short : match.team2Short)
    : null;
  const stageLabel = match.matchStage === 'FINAL' ? 'FINAL' : match.matchStage === 'SEMI FINAL' ? 'SEMI' : match.matchStage?.replace(/_/g,' ') ?? '';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, marginBottom: spacing.sm })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: match.matchStage === 'FINAL' ? '#F59E0B28' : colors.border, paddingHorizontal: spacing.lg, paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {/* T1 */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {logo1 ? <Image source={{ uri: logo1 }} style={{ width: 28, height: 28 }} resizeMode="contain" /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c1 + '20', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c1, fontSize: 8, fontWeight: '900' }}>{match.team1Short.slice(0,3)}</Text></View>}
            <Text style={{ color: winShort === match.team1Short ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: winShort === match.team1Short ? '700' : '500' }}>{match.team1Short}</Text>
            {match.score1 ? <Text style={{ color: winShort === match.team1Short ? colors.accent : colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>{match.score1}</Text> : null}
          </View>
          {/* Stage badge */}
          <View style={{ backgroundColor: match.matchStage === 'FINAL' ? '#F59E0B14' : colors.cardElevated, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: match.matchStage === 'FINAL' ? '#F59E0B35' : colors.border }}>
            <Text style={{ color: match.matchStage === 'FINAL' ? '#F59E0B' : colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 }}>{stageLabel}</Text>
          </View>
          {/* T2 */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            {match.score2 ? <Text style={{ color: winShort === match.team2Short ? colors.accent : colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>{match.score2}</Text> : null}
            <Text style={{ color: winShort === match.team2Short ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: winShort === match.team2Short ? '700' : '500' }}>{match.team2Short}</Text>
            {logo2 ? <Image source={{ uri: logo2 }} style={{ width: 28, height: 28 }} resizeMode="contain" /> : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c2 + '20', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c2, fontSize: 8, fontWeight: '900' }}>{match.team2Short.slice(0,3)}</Text></View>}
          </View>
        </View>
        {match.result && (
          <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 6, textAlign: 'center' }} numberOfLines={1}>{match.result}</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Football Home Screen ──────────────────────────────────────

function FootballHomeScreen() {
  const { league }  = useLeague();
  const router      = useRouter();
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { unreadCount } = useNotificationBadge();

  const { liveMatches, upcomingMatches, completedMatches, isLoading, isRefetching, refetch } = useFootballMatches();
  const { data: groups }    = useWC2026Groups();
  const { data: tips = [] } = useFootballTips();
  const { data: wcStats }   = useWCHistoryStats();

  const featuredMatch  = liveMatches[0] ?? upcomingMatches[0] ?? null;
  const recentResults  = completedMatches.slice(0, 3);

  // Show first 2 groups for the standings preview
  const groupEntries = groups
    ? Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).slice(0, 2)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LeagueSheet visible={sheetOpen}  onClose={() => setSheetOpen(false)} />
      <SideDrawer  visible={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenLeague={() => setSheetOpen(true)} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#16A34A" colors={["#16A34A"]} />
          }
        >
          {/* ── Header ─────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.lg }}>
            <View>
              <Pressable
                onPress={() => setSheetOpen(true)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 })}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#BBF7D0' }}>
                  <Text style={{ fontSize: 12 }}>{league.flag}</Text>
                  <Text style={{ color: '#16A34A', fontSize: font.xs, fontWeight: '700' }}>{league.short} {league.season}</Text>
                  <Ionicons name="chevron-down" size={12} color="#16A34A" />
                </View>
              </Pressable>
              <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 }}>PredictX</Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>{greeting()} · {formatDate()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
              <Pressable onPress={() => setDrawerOpen(true)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' })}>
                <Ionicons name="menu-outline" size={20} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* ── WC Banner ──────────────────────────────── */}
          <View style={{ backgroundColor: '#052e16', borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.xl, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm }}>
              <Text style={{ fontSize: 20 }}>🏆</Text>
              <Text style={{ color: '#86efac', fontSize: font.xs, fontWeight: '800', letterSpacing: 1.5 }}>FIFA WORLD CUP 2026</Text>
            </View>
            <Text style={{ color: '#ffffff', fontSize: font.md, fontWeight: '700', marginBottom: 2 }}>
              USA · Canada · Mexico
            </Text>
            <Text style={{ color: '#4ade80', fontSize: font.xs }}>48 teams · 12 groups · June–July 2026</Text>
          </View>

          {/* ── Live matches ───────────────────────────── */}
          {liveMatches.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionTitle title="🔴  Live Now" />
              {liveMatches.map(m => <FootballMatchCard key={m.id} match={m} />)}
            </View>
          )}

          {/* ── Featured / next match ──────────────────── */}
          {!isLoading && featuredMatch && liveMatches.length === 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionTitle title="⚡  Next Match" />
              <FootballMatchCard match={featuredMatch} />
            </View>
          )}

          {/* ── Countdown card (pre-tournament, no upcoming fixtures) ── */}
          {!isLoading && !featuredMatch && liveMatches.length === 0 && (() => {
            const kickoff    = new Date('2026-06-11T00:00:00Z');
            const diffMs     = kickoff.getTime() - Date.now();
            const diffDays   = Math.max(0, Math.floor(diffMs / 86400000));
            const diffHours  = Math.max(0, Math.floor((diffMs % 86400000) / 3600000));
            const countdown  = diffDays > 0 ? `${diffDays} days ${diffHours} hrs` : diffMs > 0 ? `${diffHours} hrs` : 'Underway!';
            return (
              <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: '#BBF7D0', overflow: 'hidden', marginBottom: spacing.xl }}>
                <View style={{ height: 3, backgroundColor: '#16A34A' }} />
                <View style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
                  <Text style={{ fontSize: 32 }}>⚽</Text>
                  <Text style={{ color: '#16A34A', fontSize: font.xs, fontWeight: '800', letterSpacing: 2 }}>KICKOFF IN</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>{countdown}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>
                    Jun 11 – Jul 19 · USA · Canada · Mexico
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm }}>
                    {[{ n: '48', l: 'Teams' }, { n: '12', l: 'Groups' }, { n: '104', l: 'Matches' }].map(i => (
                      <View key={i.l} style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#16A34A', fontSize: font.lg, fontWeight: '900' }}>{i.n}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{i.l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })()}

          {/* ── PredictX picks ────────────────────────── */}
          {tips.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionTitle title="🤖  AI Picks" actionLabel="See all" onAction={() => router.push('/(tabs)/(tips)')} />
              {tips.slice(0, 2).map(t => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push('/(tabs)/(tips)')}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.9 : 1,
                    backgroundColor: colors.card, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border,
                    padding: spacing.md, marginBottom: spacing.sm,
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>
                      {t.homeTeam.flag} {t.homeTeam.shortName}  vs  {t.awayTeam.flag} {t.awayTeam.shortName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>{t.date}</Text>
                  </View>
                  {t.tip && (
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: '#16A34A', fontSize: font.xs, fontWeight: '700' }}>
                        {t.tip.confidenceLabel}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* ── WC Legends ───────────────────────────── */}
          {wcStats && wcStats.legends.length > 0 && (
            <WCLegendsSection legends={wcStats.legends} />
          )}

          {/* ── Classic Rivalries ────────────────────── */}
          {wcStats && wcStats.rivalries.length > 0 && (
            <WCRivalriesSection rivalries={wcStats.rivalries} hostWinRate={wcStats.hostWinRate} />
          )}

          {/* ── Penalty Records ──────────────────────── */}
          {wcStats && (wcStats.penaltyBest.length > 0 || wcStats.penaltyWorst.length > 0) && (
            <WCPenaltySection best={wcStats.penaltyBest} worst={wcStats.penaltyWorst} />
          )}

          {/* ── Group Standings preview ────────────────── */}
          {groupEntries.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionTitle title="📊  Group Standings" actionLabel="All groups" onAction={() => router.push('/(tabs)/(matches)')} />
              {groupEntries.map(([name, standings]) => (
                <GroupTable key={name} groupName={name} standings={standings} />
              ))}
            </View>
          )}

          {/* ── Recent results ─────────────────────────── */}
          {recentResults.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <SectionTitle title="🏁  Recent Results" />
              {recentResults.map(m => <FootballMatchCard key={m.id} match={m} />)}
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── WC History components ─────────────────────────────────────

const FB_FLAGS: Record<string, string> = {
  BRA: '🇧🇷', GER: '🇩🇪', ITA: '🇮🇹', ARG: '🇦🇷', FRA: '🇫🇷',
  URY: '🇺🇾', ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', ESP: '🇪🇸', NED: '🇳🇱', POR: '🇵🇹',
  BEL: '🇧🇪', SUI: '🇨🇭', CRO: '🇭🇷', MEX: '🇲🇽', USA: '🇺🇸',
  SEN: '🇸🇳', MAR: '🇲🇦', JPN: '🇯🇵', KOR: '🇰🇷', AUS: '🇦🇺',
  DEN: '🇩🇰', SWE: '🇸🇪', POL: '🇵🇱', CZE: '🇨🇿', SRB: '🇷🇸',
  RUS: '🇷🇺', CMR: '🇨🇲', GHA: '🇬🇭', NGA: '🇳🇬', CRC: '🇨🇷',
  ECU: '🇪🇨', COL: '🇨🇴', PAR: '🇵🇾', CHI: '🇨🇱', ALG: '🇩🇿',
  CIV: '🇨🇮', TUN: '🇹🇳', SWI: '🇨🇭',
};
function fbFlag(code: string) { return FB_FLAGS[code] ?? '🏳'; }

function WCLegendsSection({ legends }: { legends: WCTeamLegend[] }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>🌟  WC Legends</Text>
        <Text style={{ color: colors.textMuted, fontSize: 10 }}>1970–2022</Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: font.xs, marginBottom: spacing.md }}>Recency-weighted all-time rankings</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
      >
        {legends.map((team, idx) => (
          <View
            key={team.code}
            style={{
              width: 108, backgroundColor: team.titles > 0 ? '#052e16' : colors.card,
              borderRadius: radius.lg, borderWidth: 1,
              borderColor: team.titles > 0 ? '#166534' : colors.border,
              padding: 12, alignItems: 'center', gap: 4,
            }}
          >
            {idx < 3 && (
              <View style={{ position: 'absolute', top: 8, right: 8 }}>
                <Text style={{ fontSize: 10 }}>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</Text>
              </View>
            )}
            <Text style={{ fontSize: 26 }}>{fbFlag(team.code)}</Text>
            <Text style={{ color: colors.textPrimary, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>{team.name}</Text>
            {team.titles > 0 && (
              <Text style={{ fontSize: 10, letterSpacing: 1 }}>{'🏆'.repeat(Math.min(team.titles, 5))}</Text>
            )}
            <View style={{
              backgroundColor: team.titles > 0 ? '#166534' : colors.border,
              borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2,
            }}>
              <Text style={{ color: team.titles > 0 ? '#4ade80' : colors.textSecondary, fontSize: 10, fontWeight: '700' }}>
                {team.wcWinRate}% WR
              </Text>
            </View>
            {team.wcKnockoutWinRate !== null && (
              <Text style={{ color: colors.textMuted, fontSize: 9 }}>{team.wcKnockoutWinRate}% KO</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function WCRivalriesSection({ rivalries, hostWinRate }: { rivalries: WCRivalry[]; hostWinRate: number | null }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800', marginBottom: spacing.md }}>⚔️  Classic Rivalries</Text>
      {rivalries.map((r, i) => {
        const leader = r.aWins > r.bWins ? r.teamA.code : r.bWins > r.aWins ? r.teamB.code : null;
        return (
          <View
            key={i}
            style={{
              backgroundColor: colors.card, borderRadius: radius.md,
              borderWidth: 1, borderColor: colors.border,
              padding: spacing.md, marginBottom: spacing.sm,
              flexDirection: 'row', alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20 }}>{fbFlag(r.teamA.code)}</Text>
              <Text style={{ color: leader === r.teamA.code ? '#4ade80' : colors.textSecondary, fontSize: font.xs, fontWeight: leader === r.teamA.code ? '800' : '500', marginTop: 2 }}>
                {r.teamA.code}
              </Text>
            </View>
            <View style={{ alignItems: 'center', flex: 2 }}>
              <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '900', letterSpacing: 2 }}>
                {r.aWins} – {r.draws} – {r.bWins}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>{r.total} WC meetings</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 20 }}>{fbFlag(r.teamB.code)}</Text>
              <Text style={{ color: leader === r.teamB.code ? '#4ade80' : colors.textSecondary, fontSize: font.xs, fontWeight: leader === r.teamB.code ? '800' : '500', marginTop: 2 }}>
                {r.teamB.code}
              </Text>
            </View>
          </View>
        );
      })}
      {hostWinRate !== null && (
        <View style={{ backgroundColor: '#052e16', borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={{ fontSize: 20 }}>🏠</Text>
          <View>
            <Text style={{ color: '#4ade80', fontSize: font.xs, fontWeight: '800' }}>Host Nation Advantage</Text>
            <Text style={{ color: '#bbf7d0', fontSize: font.xs }}>{hostWinRate}% win rate for WC hosts (1970–2022)</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function WCPenaltySection({ best, worst }: { best: WCPenaltyRecord[]; worst: WCPenaltyRecord[] }) {
  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800', marginBottom: spacing.md }}>🎯  Penalty Records</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: '#052e16', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#166534' }}>
          <Text style={{ color: '#4ade80', fontSize: font.xs, fontWeight: '800', marginBottom: spacing.sm }}>⚡ SPECIALISTS</Text>
          {best.map(t => (
            <View key={t.code} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <Text style={{ fontSize: 14, width: 22 }}>{fbFlag(t.code)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>{t.code}</Text>
              <Text style={{ color: '#4ade80', fontSize: font.xs, fontWeight: '800' }}>{t.penaltyWinRate}%</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, backgroundColor: '#1c0a0a', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: '#7f1d1d' }}>
          <Text style={{ color: '#f87171', fontSize: font.xs, fontWeight: '800', marginBottom: spacing.sm }}>💔 STRUGGLES</Text>
          {worst.map(t => (
            <View key={t.code} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 }}>
              <Text style={{ fontSize: 14, width: 22 }}>{fbFlag(t.code)}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>{t.code}</Text>
              <Text style={{ color: '#f87171', fontSize: font.xs, fontWeight: '800' }}>{t.penaltyWinRate}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '800' }}>{title}</Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction}>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{actionLabel} →</Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Cricket Home Screen ───────────────────────────────────────

function CricketHomeScreen() {
  const router  = useRouter();
  const [rankTab,    setRankTab]    = useState<string>('t20i_men');
  const [refreshing, setRefreshing] = useState(false);
  const [sheetOpen,  setSheetOpen]  = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { league } = useLeague();
  const { unreadCount } = useNotificationBadge();

  const { getLiveScore, scores: wsScores, hasReceivedData: wsReady, lastUpdatedAt } = useLiveScores();
  const { liveMatches, upcomingMatches, completedMatches, isLoading: matchLoading, refetch } = useMatchCategories();
  const { data: tableRows = [], isLoading: tableLoading }           = useIPLTable();
  const { data: allFixtures = [] }                                  = useLeagueFixtures();
  const { data: rankings,  isLoading: rankLoading }                 = useHomeRankings();

  // Predictions for live match card + expert pick section — scoped to the active league
  const { data: expertPredictions = [] } = useQuery<{ id: string; match_id: string | null; match_label: string | null; league_id: string | null; predicted_winner: string; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; analysis: string }[]>({
    queryKey: ['expert-predictions', league.id],
    queryFn:  async () => { const r = await api.get<{ predictions: any[] }>(`/expert-predictions?league=${league.id}`); return r.predictions ?? []; },
    staleTime: 0, refetchOnMount: true,
  });
  const { data: tips = [] } = useTipsList();
  const { data: news = [],  isLoading: newsLoading }                = useHomeNews();
  const { data: seasonStats } = useSeasonStats(league.id === 'ipl');

  // Prefetch news images as soon as data arrives so they load instantly when user scrolls
  useEffect(() => {
    if (news.length === 0) return;
    news.slice(0, 5).forEach(item => {
      if (item.image) {
        const uri = item.image.startsWith('/') ? API_BASE_URL.replace('/api', '') + item.image : item.image;
        ExpoImage.prefetch(uri).catch(() => {});
      }
    });
  }, [news.length]);

  // League-complete detection — no upcoming, no live, but has past matches
  const leagueComplete = !matchLoading && liveMatches.length === 0 && upcomingMatches.length === 0 && completedMatches.length > 0;

  // Find champion / runner-up from the final match (falls back to most recent)
  const champData = useMemo(() => {
    if (!leagueComplete) return null;
    const finalMatch = completedMatches.find(m => m.matchStage === 'FINAL') ?? completedMatches[0];
    if (!finalMatch) return null;
    const winnerName = finalMatch.winner ?? '';
    const team1IsChamp = winnerName
      ? finalMatch.team1Name === winnerName
      : tableRows[0]?.teamShort === finalMatch.team1Short;
    return {
      champ:       team1IsChamp
        ? { name: finalMatch.team1Name, short: finalMatch.team1Short, logo: finalMatch.team1Logo }
        : { name: finalMatch.team2Name, short: finalMatch.team2Short, logo: finalMatch.team2Logo },
      runner:      team1IsChamp
        ? { name: finalMatch.team2Name, short: finalMatch.team2Short, logo: finalMatch.team2Logo }
        : { name: finalMatch.team1Name, short: finalMatch.team1Short, logo: finalMatch.team1Logo },
      finalResult: finalMatch.result ?? '',
    };
  }, [leagueComplete, completedMatches, tableRows]);

  // Key playoff/final results for the highlights section
  const keyResults = useMemo(() => {
    if (!leagueComplete) return [];
    return completedMatches
      .filter(m => m.matchStage !== 'LEAGUE')
      .slice(0, 6);
  }, [leagueComplete, completedMatches]);

  const effectiveLive = useMemo(() => {
    // Only trust WS after it has sent at least one ipl:live message.
    // Before that, fall back to REST so a live match isn't missed during WS handshake.
    if (wsReady) {
      if (wsScores.size === 0) return []; // WS confirmed: nothing live
      const all = dedupeMatches([...liveMatches, ...upcomingMatches]);
      return all
        .filter(m => getLiveScore(m.team1Short, m.team2Short)?.status === 'live')
        .map(m => {
          const s = getLiveScore(m.team1Short, m.team2Short);
          if (!s) return m;
          return { ...m, score1: s.score1 ?? m.score1, score2: s.score2 ?? m.score2, overs1: s.overs1 ?? m.overs1, overs2: s.overs2 ?? m.overs2, statusText: s.statusText || m.statusText, status: 'live' as const, isLive: true, isUpcoming: false, isCompleted: false };
        });
    }
    // WS hasn't sent data yet — use REST
    return liveMatches;
  }, [liveMatches, upcomingMatches, getLiveScore, wsScores, wsReady]);

  // All live matches for the selected league (already filtered by useLiveScores + useMatchCategories)
  const liveMatch = effectiveLive[0] ?? null;

  // Per-match predictions map for all live matches
  const livePicksMap = useMemo(() => {
    const map = new Map<string, { expertPick: string | null; aiPick: string | null; liveScore: any }>();
    for (const m of effectiveLive) {
      const id = String(m.id);
      map.set(id, {
        expertPick: expertPredictions.find(p => p.match_id && String(p.match_id) === id)?.predicted_winner ?? null,
        aiPick:     tips.find(t => String(t.id) === id)?.tip?.winner ?? null,
        liveScore:  getLiveScore(m.team1Short, m.team2Short),
      });
    }
    return map;
  }, [effectiveLive, expertPredictions, tips, getLiveScore]);

  const nextMatch = useMemo(() => {
    if (upcomingMatches.length === 0) return null;
    return [...upcomingMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [upcomingMatches]);

  // Next few upcoming matches (after the hero one)
  const moreUpcoming = useMemo(() => {
    if (upcomingMatches.length === 0) return [];
    const sorted = [...upcomingMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return liveMatch ? sorted.slice(0, 4) : sorted.slice(1, 5);
  }, [upcomingMatches, liveMatch]);

  // Recent results — last 3 completed
  const recentResults = useMemo(() =>
    [...completedMatches]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3),
  [completedMatches]);

  // AI picks — upcoming matches with a valid tip
  const aiPickMatches = useMemo(() =>
    (tips as MatchWithTip[]).filter(t => t.tip?.winner).slice(0, 3),
  [tips]);

  // Expert pick of the day — most recent high-confidence prediction, else just most recent
  const expertPickOfDay = useMemo(() => {
    if (expertPredictions.length === 0) return null;
    return expertPredictions.find(p => p.confidence === 'HIGH') ?? expertPredictions[0];
  }, [expertPredictions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const goMatch     = useCallback((id: string) => router.push(`/(match-details)/${id}`), [router]);
  const goFixtures  = useCallback(() => router.push('/(tabs)/(matches)'), [router]);
  const goTips      = useCallback(() => router.push('/(tabs)/(tips)'), [router]);
  const goExpert    = useCallback(() => router.push('/(expert)' as any), [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LeagueSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} />
      <SideDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} onOpenLeague={() => setSheetOpen(true)} />


      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          <View style={{ paddingHorizontal: spacing.lg }}>

            {/* ── Header ── */}
            <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.xl, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  {/* League badge — tap to open selector */}
                  <Pressable
                    onPress={() => setSheetOpen(true)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: colors.accentDim, borderRadius: 6,
                      paddingHorizontal: 8, paddingVertical: 3,
                      borderWidth: 1, borderColor: colors.accent + '25',
                    })}
                  >
                    <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>
                      {league.short}{league.season ? ` ${league.season}` : ''}
                    </Text>
                    <Ionicons name="chevron-down" size={10} color={colors.accent} />
                  </Pressable>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{formatDate()}</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: font.xxl, fontWeight: '800', letterSpacing: -0.5 }}>PredictX</Text>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>{greeting()}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
                {liveMatch && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.live + '15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.live + '30' }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
                    <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.5 }}>LIVE</Text>
                  </View>
                )}
                {/* Search */}
                <Pressable
                  onPress={() => router.push('/(search)' as any)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  })}
                >
                  <Ionicons name="search-outline" size={18} color={colors.textPrimary} />
                </Pressable>
                {/* Hamburger */}
                <Pressable
                  onPress={() => setDrawerOpen(true)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
                    alignItems: 'center', justifyContent: 'center',
                  })}
                >
                  <Ionicons name="menu" size={20} color={colors.textPrimary} />
                  {unreadCount > 0 && (
                    <View style={{
                      position: 'absolute', top: -3, right: -3,
                      width: 10, height: 10, borderRadius: 5,
                      backgroundColor: '#ef4444',
                      borderWidth: 1.5, borderColor: colors.bg,
                    }} />
                  )}
                </Pressable>
              </View>
            </View>

            {/* ── Quick Actions ── */}
            <QuickActions onFixtures={goFixtures} onTips={goTips} onStandings={goFixtures} onExpert={goExpert} />

            {/* ── International Cricket entry point — only on default (IPL) home ── */}
            {league.slug === 'ipl' && (
              <InternationalBanner onPress={() => router.push('/(international)' as any)} />
            )}

            {/* ── Hero: Season Complete OR Live OR Next Up ── */}
            {leagueComplete && champData ? (
              <>
                <SeasonCompleteCard
                  champ={champData.champ}
                  runner={champData.runner}
                  finalResult={champData.finalResult}
                  leagueName={`${league.name} ${league.season}`}
                  onViewResults={goFixtures}
                />
                {keyResults.length > 0 && (
                  <View style={{ marginBottom: spacing.xl }}>
                    <SectionHeader title="Season Highlights" onMore={goFixtures} moreLabel="All Results" />
                    {keyResults.map(m => (
                      <KeyResultRow key={m.id} match={m} onPress={() => goMatch(m.id)} />
                    ))}
                  </View>
                )}
              </>
            ) : effectiveLive.length > 0 ? (
              <>
                <SectionHeader
                  title={effectiveLive.length > 1 ? `${effectiveLive.length} Live Matches` : 'Live Match'}
                  accent={colors.live}
                />
                {effectiveLive.map(m => {
                  const picks = livePicksMap.get(String(m.id));
                  return (
                    <LiveMatchCard
                      key={m.id}
                      match={m}
                      onPress={() => goMatch(m.id)}
                      lastUpdatedAt={lastUpdatedAt}
                      expertPick={picks?.expertPick}
                      aiPick={picks?.aiPick}
                      liveScore={picks?.liveScore}
                    />
                  );
                })}
              </>
            ) : nextMatch ? (
              <>
                <SectionHeader title="Next Match" accent={colors.accent} />
                <NextMatchCard
                  match={nextMatch}
                  onPress={() => goMatch(nextMatch.id)}
                  onPredictionPress={() => router.push(`/(tip-detail)/${nextMatch.id}`)}
                />
              </>
            ) : null}

            {/* ── Tournament Strip ── */}
            {tableRows.length > 0 && (
              <TournamentStrip
                rows={tableRows}
                totalFixtures={allFixtures.length}
                completedFixtures={allFixtures.filter(f => f.isCompleted).length}
              />
            )}

            {/* ── Recent Results ── */}
            {recentResults.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Recent Results" onMore={goFixtures} moreLabel="All Results" />
                {recentResults.map(m => (
                  <RecentResultRow key={m.id} match={m} onPress={() => goMatch(m.id)} />
                ))}
              </View>
            )}

            {/* ── Team Form ── */}
            {completedMatches.length >= 3 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Team Form" />
                <TeamFormSection completed={completedMatches} />
              </View>
            )}

            {/* ── Upcoming Matches ── */}
            {moreUpcoming.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Upcoming Matches" onMore={goFixtures} moreLabel="Full Schedule" />
                {moreUpcoming.map(m => (
                  <UpcomingMatchRow key={m.id} match={m} onPress={() => goMatch(m.id)} />
                ))}
              </View>
            )}

            {/* ── Orange Cap / Purple Cap / Top Sixes ── */}
            {league.id === 'ipl' && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Season Leaderboards" />
                <CapLeaderboard
                  orangeCap={seasonStats?.orangeCap ?? []}
                  purpleCap={seasonStats?.purpleCap ?? []}
                  sixHitters={seasonStats?.sixHitters ?? []}
                />
              </View>
            )}

            {/* ── Expert Pick of the Day ── */}
            {expertPickOfDay && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Expert Prediction" onMore={goExpert} moreLabel="See all" />
                <ExpertPickCard prediction={expertPickOfDay} onPress={goExpert} />
              </View>
            )}

            {/* ── AI Picks Preview ── */}
            {aiPickMatches.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="AI Match Predictions" onMore={goTips} moreLabel="All Picks" accent={colors.accent} />
                {aiPickMatches.map(m => (
                  <AIPickRow key={String((m as any).id)} match={m} onPress={() => router.push(`/(tip-detail)/${(m as any).id}`)} />
                ))}
              </View>
            )}

            {/* ── IPL Standings ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title={`${league.short} ${league.season} Standings`} onMore={goFixtures} moreLabel="Full Table" />
              {tableLoading
                ? <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    {[0,1,2,3,4].map(i => <StandingRowSkeleton key={i} />)}
                  </View>
                : tableRows.length > 0
                  ? <MiniTable rows={tableRows} />
                  : <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Standings update after matches</Text>
                    </View>
              }
            </View>

            {/* ── ICC Team Rankings ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="ICC Rankings" onMore={() => router.push('/(tabs)/(matches)/rankings' as any)} moreLabel="All formats" />
              {/* Format tabs */}
              <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
                {(['T20I', 'ODI', 'Test'] as const).map(t => {
                  const key = t === 'T20I' ? 't20i_men' : t === 'ODI' ? 'odi_men' : 'test_men';
                  const active = rankTab === key;
                  return (
                    <Pressable key={t} onPress={() => setRankTab(key)} style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: active ? colors.accent : 'transparent', alignItems: 'center' }}>
                      <Text style={{ color: active ? '#FFFFFF' : colors.textSecondary, fontSize: font.xs, fontWeight: '700' }}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TeamRankingsWidget
                teams={(rankings?.rankings as any)?.[rankTab] ?? []}
                loading={rankLoading}
              />
              <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center', marginTop: spacing.md }}>
                ICC Team Rankings · Powered by Sportsmonks
              </Text>
            </View>

            {/* ── Cricket News (moved to bottom) ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="Cricket News" />
              {newsLoading ? (
                <>
                  <NewsCardSkeleton featured />
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                </>
              ) : news.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, gap: spacing.sm }}>
                  <Ionicons name="newspaper-outline" size={28} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>News temporarily unavailable</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>Cricket news will appear once the feed is restored</Text>
                </View>
              ) : (
                <>
                  <NewsCard item={news[0]} onPress={() => router.push(`/(news-detail)/${news[0].id}`)} featured />
                  {news.slice(1, 5).map((item, idx) => (
                    <NewsCard key={item.id ?? idx} item={item} onPress={() => router.push(`/(news-detail)/${item.id}`)} />
                  ))}
                </>
              )}
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export { default } from './HomeRouter';
