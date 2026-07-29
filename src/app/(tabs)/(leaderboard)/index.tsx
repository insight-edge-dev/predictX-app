import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLeaderboard, useMyPredictionStats } from '@/hooks/useUserPrediction';
import { AppBanner } from '@/components/ads/AppBanner';
import { useAuth } from '@/contexts/AuthContext';
import { colors, font, spacing, radius } from '@/constants/theme';

// ── Constants ──────────────────────────────────────────────────────

const GOLD   = '#F59E0B';
const SILVER = '#94A3B8';
const BRONZE = '#B45309';
const LIMIT  = 50;

type Period = 'week' | 'all';

const MEDALS  = ['🥇', '🥈', '🥉'];
const MEDALS_COLOR = [GOLD, SILVER, BRONZE];

// ── Helpers ────────────────────────────────────────────────────────

function avatarColor(name: string) {
  const palette = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length;
  return palette[Math.abs(h)];
}

function initials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 15 ? GOLD : score >= 8 ? colors.accent : colors.textMuted;
  return (
    <View style={[s.scorePill, { backgroundColor: color + '18' }]}>
      <Text style={[s.scoreText, { color }]}>{score.toFixed(1)}</Text>
      <Text style={[s.scoreLabel, { color }]}>score</Text>
    </View>
  );
}

// ── Podium (top 3) ────────────────────────────────────────────────

function PodiumCard({
  rank, name, correct, total, score, isMe,
}: { rank: 1|2|3; name: string; correct: number; total: number; score: number; isMe: boolean }) {
  const color   = MEDALS_COLOR[rank - 1];
  const bgCol   = avatarColor(name);
  const isFirst = rank === 1;

  return (
    <View style={[s.podiumCard, isFirst && s.podiumCardFirst, isMe && { borderColor: colors.accent, borderWidth: 2 }]}>
      <Text style={[s.podiumMedal, isFirst && s.podiumMedalFirst]}>{MEDALS[rank - 1]}</Text>

      <View style={[s.podiumAvatar, isFirst && s.podiumAvatarFirst, { backgroundColor: bgCol }]}>
        <Text style={[s.podiumInitials, isFirst && s.podiumInitialsFirst]}>{initials(name)}</Text>
      </View>

      <Text style={[s.podiumName, isFirst && { fontSize: font.sm, color: colors.textPrimary }]} numberOfLines={1}>
        {isMe ? 'You' : name.split(' ')[0]}
      </Text>

      {/* Score (primary) */}
      <View style={[s.podiumAccRow, { backgroundColor: color + '18' }]}>
        <Text style={[s.podiumAcc, { color }]}>{score.toFixed(1)}</Text>
      </View>
      <Text style={s.podiumGames}>{correct}/{total} correct</Text>

      <View style={[s.pedestal, { backgroundColor: color + '22', height: rank === 1 ? 28 : rank === 2 ? 20 : 14 }]} />
    </View>
  );
}

// ── List row (4th and beyond) ──────────────────────────────────────

function RankRow({
  rank, name, correct, total, accuracy, score, isMe,
}: { rank: number; name: string; correct: number; total: number; accuracy: number; score: number; isMe: boolean }) {
  const bgCol   = avatarColor(name);
  const isTop10 = rank <= 10;

  return (
    <View style={[s.row, isMe && s.rowMe]}>
      <View style={s.rankBox}>
        <Text style={[s.rankNum, isTop10 && { color: colors.accent, fontWeight: '800' }]}>
          #{rank}
        </Text>
      </View>

      <View style={[s.rowAvatar, { backgroundColor: bgCol }]}>
        <Text style={s.rowInitials}>{initials(name)}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[s.rowName, isMe && { color: colors.accent }]} numberOfLines={1}>
          {isMe ? 'You (' + name.split(' ')[0] + ')' : name}
        </Text>
        <Text style={s.rowGames}>{correct}/{total} correct · {accuracy}% acc</Text>
      </View>

      <ScorePill score={score} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────

export default function LeaderboardScreen() {
  const [period, setPeriod] = useState<Period>('week');
  const { user, isAuthenticated } = useAuth();
  const { data: weekEntries = [], isLoading: weekLoading, isError: weekError, refetch: weekRefetch } = useLeaderboard(LIMIT, 'week');
  const { data: allEntries  = [], isLoading: allLoading,  isError: allError,  refetch: allRefetch  } = useLeaderboard(LIMIT, 'all');
  const { data: myStats } = useMyPredictionStats(isAuthenticated);

  const activeRaw    = period === 'week' ? weekEntries : allEntries;
  const usingFallback = period === 'week' && !weekLoading && weekEntries.length < 5;
  const entries      = usingFallback ? allEntries : activeRaw;
  const isLoading    = period === 'week' ? weekLoading : allLoading;
  const isError      = period === 'week' ? weekError   : allError;
  const refetch      = () => { weekRefetch(); allRefetch(); };

  const myId    = user?.id;
  const myIdx   = useMemo(() => entries.findIndex(e => e.user_id === myId), [entries, myId]);
  const myEntry = myIdx >= 0 ? entries[myIdx] : null;

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  const participantLabel = entries.length >= LIMIT
    ? `${LIMIT}+ participants`
    : `${entries.length} participant${entries.length !== 1 ? 's' : ''}`;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.trophy}>🏆</Text>
          <View>
            <Text style={s.title}>Leaderboard</Text>
            <Text style={s.subtitle}>{participantLabel}</Text>
          </View>
        </View>

        {/* Period toggle */}
        <View style={s.periodRow}>
          {(['week', 'all'] as Period[]).map(p => (
            <Pressable
              key={p}
              onPress={() => setPeriod(p)}
              style={[s.periodBtn, period === p && s.periodBtnActive]}
            >
              <Text style={[s.periodLabel, period === p && s.periodLabelActive]}>
                {p === 'week' ? 'This Week' : 'All Time'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {usingFallback && (
        <View style={s.fallbackBanner}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <Text style={s.fallbackText}>No activity this week · Showing All Time</Text>
        </View>
      )}

      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={s.loaderText}>Loading rankings…</Text>
        </View>
      ) : isError ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>⚠️</Text>
          <Text style={s.emptyTitle}>Failed to load</Text>
          <Text style={s.emptySubtitle}>Could not fetch the leaderboard. Check your connection and try again.</Text>
          <Pressable style={s.retryBtn} onPress={() => refetch()}>
            <Ionicons name="refresh" size={16} color={colors.accent} />
            <Text style={s.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : entries.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🏅</Text>
          <Text style={s.emptyTitle}>No rankings yet</Text>
          <Text style={s.emptySubtitle}>
            {period === 'week'
              ? 'Predictions made this week will appear here.'
              : 'Make your first prediction to appear on the board.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Podium ──────────────────────────────────────────── */}
          {top3.length >= 3 && (
            <View style={s.podiumWrap}>
              {/* Decorative glow */}
              <View style={s.podiumGlow} />

              {/* 2nd | 1st | 3rd */}
              <View style={s.podiumRow}>
                {[1, 0, 2].map(i => {
                  const e = top3[i];
                  if (!e) return null;
                  const rank = (i + 1) as 1|2|3;
                  return (
                    <PodiumCard
                      key={e.user_id}
                      rank={rank}
                      name={e.display_name}
                      correct={e.correct}
                      total={e.total}
                      score={e.score ?? 0}
                      isMe={e.user_id === myId}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Section header ──────────────────────────────────── */}
          {rest.length > 0 && (
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Rankings</Text>
              <Ionicons name="stats-chart" size={14} color={colors.textMuted} />
            </View>
          )}

          {/* ── List (4th onward) ────────────────────────────────── */}
          {rest.map((e, i) => (
            <RankRow
              key={e.user_id}
              rank={i + 4}
              name={e.display_name}
              correct={e.correct}
              total={e.total}
              accuracy={e.accuracy}
              score={e.score ?? 0}
              isMe={e.user_id === myId}
            />
          ))}

          {/* Bottom breathing room for the sticky bar */}
          <View style={{ height: myEntry ? 80 : 24 }} />
        </ScrollView>
      )}

      <AppBanner />

      {/* ── Sticky "your rank" bar ────────────────────────────── */}
      {isAuthenticated && myEntry && (
        <View style={s.myBar}>
          <View style={[s.myBarAvatar, { backgroundColor: avatarColor(myEntry.display_name) }]}>
            <Text style={s.myBarInitials}>{initials(myEntry.display_name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.myBarName}>{myEntry.display_name}</Text>
            <Text style={s.myBarGames}>
              {myEntry.correct}/{myEntry.total} correct · {myEntry.accuracy}% · Score {(myEntry.score ?? 0).toFixed(1)}
            </Text>
          </View>
          <View style={s.myBarRankBox}>
            <Text style={s.myBarRankLabel}>YOUR RANK</Text>
            <Text style={s.myBarRank}>#{myEntry.rank}</Text>
          </View>
        </View>
      )}

      {/* Fewer than 5 RESOLVED predictions — not qualified yet */}
      {isAuthenticated && !myEntry && myStats && (() => {
        const resolved = myStats.correct + myStats.wrong;
        const needed   = Math.max(0, 5 - resolved);
        if (resolved >= 5) return null; // qualified but outside top-N — handled below
        return (
          <View style={s.myBar}>
            <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
            <View style={{ flex: 1 }}>
              {needed > 0 ? (
                <>
                  <Text style={s.myBarName}>{needed} more resolved prediction{needed !== 1 ? 's' : ''} to rank</Text>
                  <Text style={s.myBarGames}>
                    {resolved} resolved · {myStats.pending ?? 0} pending result
                    {(myStats.pending ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={s.myBarName}>Calculating your rank…</Text>
                  <Text style={s.myBarGames}>{myStats.correct}/{resolved} correct</Text>
                </>
              )}
            </View>
          </View>
        );
      })()}

      {/* Qualified (5+ resolved) but outside top-N */}
      {isAuthenticated && !myEntry && myStats && (myStats.correct + myStats.wrong) >= 5 && (
        <View style={s.myBar}>
          <Ionicons name="trophy-outline" size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
          <View style={{ flex: 1 }}>
            <Text style={s.myBarName}>Not in top {LIMIT}</Text>
            <Text style={s.myBarGames}>{myStats.correct}/{myStats.correct + myStats.wrong} correct · {myStats.accuracy}% accuracy</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: {
    flex:            1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor:   colors.card,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.md,
    marginBottom:  spacing.md,
  },
  trophy: {
    fontSize: 32,
  },
  title: {
    fontSize:   font.xxl,
    fontWeight: '900',
    color:      colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: font.sm,
    color:    colors.textMuted,
    marginTop: 1,
  },
  periodRow: {
    flexDirection:   'row',
    gap:             spacing.xs,
    backgroundColor: colors.cardElevated,
    borderRadius:    radius.xl,
    padding:         3,
  },
  periodBtn: {
    flex:           1,
    paddingVertical: spacing.xs + 2,
    alignItems:      'center',
    borderRadius:    radius.lg,
  },
  periodBtnActive: {
    backgroundColor: colors.card,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    4,
    elevation:       2,
  },
  periodLabel: {
    fontSize:   font.sm,
    fontWeight: '600',
    color:      colors.textMuted,
  },
  periodLabelActive: {
    color:      colors.accent,
    fontWeight: '700',
  },

  // Loader / empty
  loader: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            spacing.md,
  },
  loaderText: {
    fontSize: font.base,
    color:    colors.textMuted,
  },
  empty: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
    gap:            spacing.md,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: {
    fontSize:   font.xl,
    fontWeight: '800',
    color:      colors.textPrimary,
    textAlign:  'center',
  },
  emptySubtitle: {
    fontSize:  font.base,
    color:     colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    marginTop:       spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm,
    borderRadius:    radius.xl,
    borderWidth:     1,
    borderColor:     colors.accent,
  },
  retryLabel: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.accent,
  },

  // Scroll
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.lg,
  },

  // Podium
  podiumWrap: {
    marginBottom: spacing.xl,
    position:     'relative',
  },
  podiumGlow: {
    position:        'absolute',
    top:             0,
    alignSelf:       'center',
    width:           180,
    height:          180,
    borderRadius:    90,
    backgroundColor: GOLD + '10',
    // blur via large radius
    shadowColor:     GOLD,
    shadowOffset:    { width: 0, height: 0 },
    shadowOpacity:   0.3,
    shadowRadius:    40,
  },
  podiumRow: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    justifyContent: 'center',
    gap:            spacing.sm,
    paddingVertical: spacing.lg,
  },
  podiumCard: {
    flex:            1,
    alignItems:      'center',
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    paddingVertical:  spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth:     1,
    borderColor:     colors.border,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       3,
    overflow:        'hidden',
  },
  podiumCardFirst: {
    paddingVertical: spacing.lg,
    transform:       [{ translateY: -12 }],
    borderColor:     GOLD + '60',
    shadowColor:     GOLD,
    shadowOpacity:   0.25,
    shadowRadius:    16,
    elevation:       8,
  },
  podiumMedal: {
    fontSize:     22,
    marginBottom: 4,
  },
  podiumMedalFirst: {
    fontSize: 28,
  },
  podiumAvatar: {
    width:          44,
    height:         44,
    borderRadius:   22,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   spacing.xs,
  },
  podiumAvatarFirst: {
    width:        54,
    height:       54,
    borderRadius: 27,
  },
  podiumInitials: {
    fontSize:   font.sm,
    fontWeight: '800',
    color:      '#FFF',
  },
  podiumInitialsFirst: {
    fontSize: font.md,
  },
  podiumName: {
    fontSize:   font.xs,
    fontWeight: '700',
    color:      colors.textSecondary,
    marginBottom: 4,
    textAlign:  'center',
  },
  podiumAccRow: {
    paddingHorizontal: 8,
    paddingVertical:   2,
    borderRadius:      20,
    marginBottom:      4,
  },
  podiumAcc: {
    fontSize:   font.xs,
    fontWeight: '800',
  },
  podiumGames: {
    fontSize:     9,
    color:        colors.textMuted,
    marginBottom: 6,
  },
  pedestal: {
    width:        '100%',
    borderRadius: 4,
    marginTop:    4,
  },

  // List rows
  sectionHead: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    marginBottom:  spacing.md,
  },
  sectionTitle: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.card,
    borderRadius:    radius.lg,
    padding:         spacing.md,
    marginBottom:    spacing.sm,
    borderWidth:     1,
    borderColor:     colors.border,
  },
  rowMe: {
    borderColor:     colors.accent,
    backgroundColor: colors.accentDim,
  },
  rankBox: {
    width: 36,
    alignItems: 'center',
  },
  rankNum: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.textMuted,
  },
  rowAvatar: {
    width:          38,
    height:         38,
    borderRadius:   19,
    alignItems:     'center',
    justifyContent: 'center',
  },
  rowInitials: {
    fontSize:   font.xs,
    fontWeight: '800',
    color:      '#FFF',
  },
  rowName: {
    fontSize:   font.base,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  rowGames: {
    fontSize:  font.xs,
    color:     colors.textMuted,
    marginTop: 1,
  },

  // Score pill
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical:    3,
    borderRadius:       20,
    alignItems:         'center',
  },
  scoreText: {
    fontSize:            font.sm,
    fontWeight:          '800',
    fontVariant:         ['tabular-nums'],
  },
  scoreLabel: {
    fontSize:      8,
    fontWeight:    '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity:       0.6,
  },

  // My rank sticky bar
  myBar: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.md,
    backgroundColor: colors.card,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
    elevation:       8,
  },
  myBarAvatar: {
    width:          40,
    height:         40,
    borderRadius:   20,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2,
    borderColor:    colors.accent,
  },
  myBarInitials: {
    fontSize:   font.xs,
    fontWeight: '800',
    color:      '#FFF',
  },
  myBarName: {
    fontSize:   font.base,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  myBarGames: {
    fontSize:  font.xs,
    color:     colors.textMuted,
    marginTop: 1,
  },
  myBarRankBox: {
    alignItems: 'flex-end',
  },
  myBarRankLabel: {
    fontSize:      9,
    fontWeight:    '700',
    color:         colors.textMuted,
    letterSpacing: 0.6,
  },
  myBarRank: {
    fontSize:   font.xl,
    fontWeight: '900',
    color:      colors.accent,
    letterSpacing: -0.5,
  },

  fallbackBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.xs + 2,
    backgroundColor:   colors.cardElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fallbackText: {
    fontSize:  font.xs,
    color:     colors.textMuted,
    fontWeight: '500',
  },
});
