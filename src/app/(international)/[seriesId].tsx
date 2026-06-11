/**
 * Series detail — /(international)/[seriesId]
 *
 * Shows one bilateral tour's matches grouped Live → Upcoming → Completed,
 * each with an inline AI prediction that expands on tap (full factors + H2H).
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeamColor } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import { formatMatchDate } from '@/utils/date';
import { useInternationalSeriesDetail, useInternationalMatchTip } from '@/hooks/useInternational';
import type { InternationalMatch } from '@/types/international';

// ── Mini probability bar ──────────────────────────────────────

function MiniProbabilityBar({ team1Pct, team2Pct }: { team1Pct: number; team2Pct: number }) {
  return (
    <View style={{ flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.borderLight }}>
      <View style={{ flex: team1Pct, backgroundColor: colors.accent }} />
      <View style={{ flex: team2Pct, backgroundColor: colors.live }} />
    </View>
  );
}

// ── Expanded prediction panel (lazy-loads full tip) ────────────

function PredictionPanel({ matchId, team1Short, team2Short }: { matchId: string; team1Short: string; team2Short: string }) {
  const { data, isLoading } = useInternationalMatchTip(matchId);
  const tip = data?.tip;

  if (isLoading) {
    return (
      <View style={{ paddingVertical: spacing.lg, alignItems: 'center' }}>
        <ActivityIndicator color={colors.accent} size="small" />
      </View>
    );
  }
  if (!tip) {
    return (
      <Text style={{ color: colors.textMuted, fontSize: font.sm, paddingVertical: spacing.md, textAlign: 'center' }}>
        Prediction unavailable for this match
      </Text>
    );
  }

  return (
    <View style={{ paddingTop: spacing.sm, gap: spacing.md }}>
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{team1Short} {tip.team1Pct}%</Text>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{team2Short} {tip.team2Pct}%</Text>
        </View>
        <MiniProbabilityBar team1Pct={tip.team1Pct} team2Pct={tip.team2Pct} />
        <Text style={{ color: colors.textSecondary, fontSize: font.xs, marginTop: 6 }}>
          AI favors <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{tip.winner}</Text> · {tip.confidenceLabel} confidence
        </Text>
      </View>

      {tip.factors.map((f, i) => (
        <View key={i} style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', marginBottom: 4 }}>{f.label}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: f.advantage === 'team1' ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: f.advantage === 'team1' ? '700' : '400' }}>
              {f.team1Value}
            </Text>
            <Text style={{ color: f.advantage === 'team2' ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: f.advantage === 'team2' ? '700' : '400' }}>
              {f.team2Value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Match row (expandable) ─────────────────────────────────────

function TeamMini({ name, logo, isWinner }: { name: string; logo: string; isWinner?: boolean }) {
  const color = getTeamColor(name);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
      {logo ? (
        <Image source={{ uri: logo }} style={{ width: 24, height: 24 }} resizeMode="contain" />
      ) : (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color, fontSize: 10, fontWeight: '700' }}>{(name || '?').slice(0, 2)}</Text>
        </View>
      )}
      <Text style={{ color: isWinner ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: isWinner ? '800' : '600' }} numberOfLines={1}>
        {name}
      </Text>
      {isWinner && <Ionicons name="trophy" size={12} color={colors.warning} />}
    </View>
  );
}

function ScoreCell({ score, overs }: { score?: string | null; overs?: string | null }) {
  if (!score) return null;
  return (
    <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
      {score}
      {overs ? <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '400' }}> ({overs})</Text> : null}
    </Text>
  );
}

function MatchRow({ match }: { match: InternationalMatch }) {
  const [expanded, setExpanded] = useState(false);
  const tip = match.tip;
  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  const statusLabel =
    isLive      ? 'LIVE' :
    isCompleted ? 'FT'   :
    match.time || formatMatchDate(match.date);

  const statusColor =
    isLive      ? colors.live      :
    isCompleted ? colors.textMuted :
    colors.warning;

  const metaLine = [match.venue, formatMatchDate(match.date)].filter(Boolean).join(' · ');
  const hasLiveScore = !!(match.score1 || match.score2);
  const hasLiveDetail = (match.batsmen?.length ?? 0) > 0 || (match.bowlers?.length ?? 0) > 0;

  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
        borderColor: isLive ? '#FECACA' : colors.border,
        marginBottom: spacing.sm, overflow: 'hidden',
      }}>
        {isLive && <View style={{ height: 2, backgroundColor: colors.live }} />}

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
              {match.matchDesc || 'International Match'}
            </Text>
            <Text style={{ color: statusColor, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>{statusLabel}</Text>
          </View>

          {!!metaLine && (
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginBottom: spacing.sm }} numberOfLines={1}>
              {metaLine}
            </Text>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
            <TeamMini name={match.team1?.shortName} logo={match.team1?.logo} isWinner={isCompleted && match.winner === match.team1?.name} />
            <ScoreCell score={match.score1} overs={match.overs1} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginTop: 6 }}>
            <TeamMini name={match.team2?.shortName} logo={match.team2?.logo} isWinner={isCompleted && match.winner === match.team2?.name} />
            <ScoreCell score={match.score2} overs={match.overs2} />
          </View>

          {/* Live scoreboard: in-progress status, current batsmen/bowler */}
          {isLive && (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 4 }}>
              {match.statusText ? (
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '600' }}>{match.statusText}</Text>
              ) : !hasLiveScore ? (
                <Text style={{ color: colors.textMuted, fontSize: font.xs, fontStyle: 'italic' }}>Live · score updates unavailable</Text>
              ) : null}

              {hasLiveDetail && (
                <View style={{ marginTop: 2, gap: 2 }}>
                  {match.batsmen?.map((b, i) => (
                    <View key={`bat-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: font.xs }} numberOfLines={1}>
                        {b.name}{b.isStrike ? ' *' : ''}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                        {b.runs} ({b.balls}) · SR {b.sr}
                      </Text>
                    </View>
                  ))}
                  {match.bowlers?.[0] && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: font.xs }} numberOfLines={1}>
                        {match.bowlers[0].name} (bowling)
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                        {match.bowlers[0].wickets}/{match.bowlers[0].runs} ({match.bowlers[0].overs})
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Result summary + Player of the Match for completed games */}
          {isCompleted && (match.statusText || match.manOfMatch?.name) && (
            <View style={{ marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
              {!!match.statusText && (
                <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontStyle: 'italic' }}>{match.statusText}</Text>
              )}
              {!!match.manOfMatch?.name && (
                <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>
                  🏅 {match.manOfMatch.name} · Player of the Match
                </Text>
              )}
            </View>
          )}

          {/* Toss info, when known ahead of an upcoming match */}
          {!isLive && !isCompleted && !!match.toss?.winner && (
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: spacing.sm }}>
              Toss: {match.toss.winner} won, chose to {match.toss.decision || 'bat'}
            </Text>
          )}

          {tip && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
              marginTop: spacing.sm, paddingTop: spacing.sm,
              borderTopWidth: 1, borderTopColor: colors.borderLight,
            }}>
              <Ionicons name="analytics-outline" size={13} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>
                AI: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{tip.winner}</Text> to win · {tip.confidence}% {tip.confidenceLabel.toLowerCase()} confidence
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
            </View>
          )}
        </View>

        {expanded && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
            <PredictionPanel matchId={match.id} team1Short={match.team1?.shortName} team2Short={match.team2?.shortName} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Section ────────────────────────────────────────────────────

function MatchSection({ title, matches, accent }: { title: string; matches: InternationalMatch[]; accent: string }) {
  if (matches.length === 0) return null;
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent }} />
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>{title}</Text>
      </View>
      {matches.map(m => <MatchRow key={m.id} match={m} />)}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────

export default function SeriesDetailScreen() {
  const { seriesId } = useLocalSearchParams<{ seriesId: string }>();
  const router = useRouter();
  const { data, isLoading } = useInternationalSeriesDetail(seriesId);

  const series  = data?.series;
  const matches = data?.matches;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', flex: 1 }} numberOfLines={1}>
          {series?.name ?? 'Series'}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !series || !matches ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: font.base }}>Series not found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
          {/* Teams strip */}
          <View style={{
            backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
            padding: spacing.lg, marginBottom: spacing.xl, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md,
          }}>
            {series.teams.map(t => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {t.logo ? (
                  <Image source={{ uri: t.logo }} style={{ width: 22, height: 22 }} resizeMode="contain" />
                ) : null}
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>{t.name}</Text>
              </View>
            ))}
          </View>

          <MatchSection title="Live"      matches={matches.live}      accent={colors.live} />
          <MatchSection title="Upcoming"  matches={matches.upcoming}  accent={colors.warning} />
          <MatchSection title="Completed" matches={matches.completed} accent={colors.textMuted} />

          {matches.live.length === 0 && matches.upcoming.length === 0 && matches.completed.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: spacing.md }}>No matches found in this series</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
