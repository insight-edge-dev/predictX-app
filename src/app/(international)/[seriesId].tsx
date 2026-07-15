/**
 * Series detail — /(international)/[seriesId]
 *
 * Shows one bilateral tour's matches grouped Live → Upcoming → Completed,
 * each with an inline AI prediction that expands on tap (full factors + H2H).
 * Live matches auto-refresh every 30 s.
 */

import { useState } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { safeBack } from '@/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTeamColor } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import { formatMatchDate } from '@/utils/date';
import { useInternationalSeriesDetail, useInternationalMatchTip } from '@/hooks/useInternational';
import type { InternationalMatch, InternationalSeries } from '@/types/international';

// ── Mini probability bar ──────────────────────────────────────

function MiniProbabilityBar({ team1Pct, team2Pct }: { team1Pct: number; team2Pct: number }) {
  return (
    <View style={{ flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.borderLight }}>
      <View style={{ flex: team1Pct, backgroundColor: colors.accent }} />
      <View style={{ flex: team2Pct, backgroundColor: colors.live }} />
    </View>
  );
}

// ── Expanded prediction panel ──────────────────────────────────

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
    <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
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
            <Text style={{
              color: f.advantage === 'team1' ? colors.textPrimary : colors.textSecondary,
              fontSize: font.sm,
              fontWeight: f.advantage === 'team1' ? '700' : '400',
            }}>{f.team1Value}</Text>
            <Text style={{
              color: f.advantage === 'team2' ? colors.textPrimary : colors.textSecondary,
              fontSize: font.sm,
              fontWeight: f.advantage === 'team2' ? '700' : '400',
            }}>{f.team2Value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Team row (Cricbuzz-style horizontal) ───────────────────────

function TeamRow({
  logo, name, score, overs, isWinner, isUpcoming, isLive,
}: {
  logo: string; name: string; score?: string | null;
  overs?: string | null; isWinner: boolean; isUpcoming: boolean; isLive?: boolean;
}) {
  const color = getTeamColor(name);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }}>
      {logo ? (
        <Image source={{ uri: logo }} style={{ width: 26, height: 26 }} contentFit="contain" />
      ) : (
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color, fontSize: 9, fontWeight: '700' }}>{(name || '?').slice(0, 2)}</Text>
        </View>
      )}

      <Text
        style={{
          flex: 1, marginLeft: 10,
          color: isWinner ? colors.textPrimary : colors.textSecondary,
          fontSize: font.base,
          fontWeight: isWinner ? '700' : '500',
        }}
        numberOfLines={1}
      >
        {name}
      </Text>

      {!isUpcoming && score ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Text style={{ color: isWinner ? colors.textPrimary : colors.textSecondary, fontSize: font.base, fontWeight: isWinner ? '700' : '400' }}>
            {score}
          </Text>
          {overs ? (
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>({overs})</Text>
          ) : null}
        </View>
      ) : null}

      {!isUpcoming && !score ? (
        <Text style={{
          color: isLive ? colors.warning : colors.textMuted,
          fontSize: font.sm,
        }}>
          {isLive ? 'Batting soon' : 'Yet to bat'}
        </Text>
      ) : null}
    </View>
  );
}

// ── Match card ─────────────────────────────────────────────────

function MatchCard({ match }: { match: InternationalMatch }) {
  const [expanded, setExpanded] = useState(false);
  const tip      = match.tip;
  const isLive   = match.status === 'live';
  const isDone   = match.isCompleted || match.status === 'completed';
  const isUpcoming = !isLive && !isDone;

  const t1Name = match.team1?.shortName ?? '';
  const t2Name = match.team2?.shortName ?? '';
  const t1Wins = isDone && !!(match.winner && match.winner === match.team1?.name);
  const t2Wins = isDone && !!(match.winner && match.winner === match.team2?.name);

  const statusLabel = isLive ? 'LIVE' : isDone ? 'FT' : (match.time || '');
  const statusColor = isLive ? colors.live : isDone ? colors.textMuted : colors.warning;

  const hasLiveScore  = !!(match.score1 || match.score2);
  const hasLiveDetail = (match.batsmen?.length ?? 0) > 0 || (match.bowlers?.length ?? 0) > 0;

  return (
    <Pressable onPress={() => setExpanded(e => !e)} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <View style={{
        backgroundColor: colors.card, borderRadius: radius.md,
        borderWidth: 1, borderColor: isLive ? '#FECACA' : colors.border,
        marginBottom: spacing.sm, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
      }}>
        {/* Live accent bar */}
        {isLive && <View style={{ height: 2, backgroundColor: colors.live }} />}

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xs,
        }}>
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }} numberOfLines={1}>
            {match.matchDesc || 'International Match'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            {isLive && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />}
            <Text style={{ color: statusColor, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.5 }}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Venue */}
        {!!(match.venue || match.date) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <Ionicons name="location-outline" size={10} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
              {[match.venue, formatMatchDate(match.date)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}

        <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

        {/* Team rows */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TeamRow logo={match.team1?.logo} name={t1Name} score={match.score1} overs={match.overs1} isWinner={t1Wins} isUpcoming={isUpcoming} isLive={isLive} />
          <View style={{ height: 1, backgroundColor: colors.borderLight }} />
          <TeamRow logo={match.team2?.logo} name={t2Name} score={match.score2} overs={match.overs2} isWinner={t2Wins} isUpcoming={isUpcoming} isLive={isLive} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

        {/* Footer: status / result / live detail */}
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          {isLive && (
            <>
              {match.statusText && !(/^Match starts at/i.test(match.statusText)) ? (
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '600', marginBottom: hasLiveDetail ? 6 : 0 }}>
                  {match.statusText}
                </Text>
              ) : !hasLiveScore ? (
                match.toss?.winner ? (
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, marginBottom: hasLiveDetail ? 6 : 0 }}>
                    Toss: {match.toss.winner} opt to {match.toss.decision || 'bat'} · Innings starting
                  </Text>
                ) : (
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, fontStyle: 'italic', marginBottom: hasLiveDetail ? 6 : 0 }}>
                    Match in progress · Score updating shortly
                  </Text>
                )
              ) : null}

              {hasLiveDetail && (
                <View style={{ gap: 2 }}>
                  {match.batsmen?.map((b, i) => (
                    <View key={`bat-${i}`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: font.xs }} numberOfLines={1}>
                        {b.name}{b.isStrike ? ' *' : ''}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                        {b.runs}({b.balls}) SR {b.sr}
                      </Text>
                    </View>
                  ))}
                  {match.bowlers?.[0] && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: font.xs }} numberOfLines={1}>
                        {match.bowlers[0].name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                        {match.bowlers[0].wickets}/{match.bowlers[0].runs} ({match.bowlers[0].overs} ov)
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </>
          )}

          {isDone && (match.statusText || match.manOfMatch?.name) && (
            <View style={{ gap: 3 }}>
              {!!match.statusText && (
                <Text style={{ color: colors.textSecondary, fontSize: font.xs }}>{match.statusText}</Text>
              )}
              {!!match.manOfMatch?.name && (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  🏅 {match.manOfMatch.name} · Player of the Match
                </Text>
              )}
            </View>
          )}

          {isUpcoming && match.toss?.winner && (
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
              Toss: {match.toss.winner} won, chose to {match.toss.decision || 'bat'}
            </Text>
          )}

          {/* AI prediction row */}
          {tip && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
              marginTop: (isLive || isDone || isUpcoming) ? spacing.sm : 0,
              paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight,
            }}>
              <Ionicons name="analytics-outline" size={13} color={colors.accent} />
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>
                AI: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{tip.winner}</Text> to win · {tip.confidence}% {tip.confidenceLabel.toLowerCase()} confidence
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
            </View>
          )}
        </View>

        {expanded && tip && (
          <View style={{
            paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
            borderTopWidth: 1, borderTopColor: colors.borderLight,
            backgroundColor: colors.cardElevated,
          }}>
            <PredictionPanel
              matchId={match.id}
              team1Short={t1Name}
              team2Short={t2Name}
            />
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
    <View style={{ marginBottom: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
        <View style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: accent }} />
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>{title}</Text>
        <View style={{
          backgroundColor: accent + '18', borderRadius: 10,
          paddingHorizontal: 8, paddingVertical: 2,
        }}>
          <Text style={{ color: accent, fontSize: 10, fontWeight: '700' }}>{matches.length}</Text>
        </View>
      </View>
      {matches.map(m => <MatchCard key={m.id} match={m} />)}
    </View>
  );
}

// ── Series hero ────────────────────────────────────────────────

function TeamLogo({ shortName, logo, size = 56 }: { shortName: string; logo: string; size?: number }) {
  const color = getTeamColor(shortName);
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: size, height: size }} contentFit="contain" />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: size * 0.32, fontWeight: '800' }}>{shortName?.slice(0, 2)}</Text>
    </View>
  );
}

function SeriesHero({ series, completedCount, totalCount, team1Wins, team2Wins }: {
  series: InternationalSeries;
  completedCount: number;
  totalCount: number;
  team1Wins: number;
  team2Wins: number;
}) {
  const teams     = series.teams.slice(0, 2);
  const remaining = totalCount - completedCount;
  const hasScore  = completedCount > 0 && teams.length === 2;

  // Series lead label: "AFG leads 2-1", "Level 1-1", "AFG won 3-0"
  function seriesLead() {
    if (!hasScore) return null;
    if (team1Wins === team2Wins) return `Series level ${team1Wins}–${team2Wins}`;
    const leader = team1Wins > team2Wins ? teams[0]?.shortName : teams[1]?.shortName;
    const verb   = remaining === 0 ? 'won' : 'lead';
    const [hi, lo] = team1Wins > team2Wins ? [team1Wins, team2Wins] : [team2Wins, team1Wins];
    return `${leader} ${verb} ${hi}–${lo}`;
  }

  const leadLabel = seriesLead();

  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: radius.xl,
      borderWidth: 1, borderColor: colors.border,
      paddingHorizontal: spacing.xl, paddingVertical: spacing.lg,
      marginBottom: spacing.xl,
    }}>
      {/* Team face-off */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {teams[0] ? (
          <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
            <TeamLogo shortName={teams[0].shortName} logo={teams[0].logo} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
              {teams[0].shortName}
            </Text>
          </View>
        ) : null}

        <View style={{ alignItems: 'center', paddingHorizontal: spacing.lg, gap: 2 }}>
          {hasScore ? (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', letterSpacing: 2 }}>
                {team1Wins} – {team2Wins}
              </Text>
              {leadLabel ? (
                <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center' }}>{leadLabel}</Text>
              ) : null}
            </>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '800', letterSpacing: 1.5 }}>
              vs
            </Text>
          )}
        </View>

        {teams[1] ? (
          <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
            <TeamLogo shortName={teams[1].shortName} logo={teams[1].logo} />
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }} numberOfLines={1}>
              {teams[1].shortName}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.borderLight, marginVertical: spacing.md }} />

      {/* Series meta pills */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' }}>
        <View style={{ backgroundColor: colors.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{series.format}</Text>
        </View>
        <View style={{ backgroundColor: colors.cardElevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' }}>
            {totalCount} matches
          </Text>
        </View>
        {completedCount > 0 && (
          <View style={{ backgroundColor: colors.successDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.success, fontSize: font.xs, fontWeight: '700' }}>
              {completedCount} played
            </Text>
          </View>
        )}
        {remaining > 0 && (
          <View style={{ backgroundColor: colors.warningDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: colors.warning, fontSize: font.xs, fontWeight: '700' }}>
              {remaining} remaining
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────

export default function SeriesDetailScreen() {
  const { seriesId } = useLocalSearchParams<{ seriesId: string }>();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useInternationalSeriesDetail(seriesId);

  const series  = data?.series;
  const matches = data?.matches;
  const isLiveNow  = (matches?.live?.length ?? 0) > 0;
  const totalCount = (matches?.live?.length ?? 0) + (matches?.upcoming?.length ?? 0) + (matches?.completed?.length ?? 0);

  const team1Name  = series?.teams[0]?.name ?? '';
  const team2Name  = series?.teams[1]?.name ?? '';
  const team1Wins  = (matches?.completed ?? []).filter(m => m.winner && m.winner === team1Name).length;
  const team2Wins  = (matches?.completed ?? []).filter(m => m.winner && m.winner === team2Name).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => safeBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }} numberOfLines={1}>
            {series?.name ?? 'Series'}
          </Text>
          {series?.format && (
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>
              {series.format} Series
            </Text>
          )}
        </View>
        {isLiveNow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.liveDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live }} />
            <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800' }}>LIVE</Text>
          </View>
        )}
      </View>

      {isLoading && !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !series || !matches ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="globe-outline" size={40} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '700', marginTop: spacing.lg }}>Series not found</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} colors={[colors.accent]} />
          }
        >
          <SeriesHero
            series={series}
            completedCount={matches.completed.length}
            totalCount={totalCount}
            team1Wins={team1Wins}
            team2Wins={team2Wins}
          />

          <MatchSection title="Live"      matches={matches.live}      accent={colors.live} />
          <MatchSection title="Upcoming"  matches={matches.upcoming}  accent={colors.warning} />
          <MatchSection title="Completed" matches={matches.completed} accent={colors.textMuted} />

          {totalCount === 0 && (
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
