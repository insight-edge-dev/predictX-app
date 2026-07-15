import {
  View, Text, Pressable, Image, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTipsList } from '@/hooks/useTips';
import { useMatchCategories } from '@/hooks/useMatches';
import { useFootballTips } from '@/hooks/useFootballTips';
import { useAllTips, type AllTipItem } from '@/hooks/useAllTips';
import { useTipsBundle } from '@/hooks/useTipsBundle';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { getTeamColor as getWCColor, getTeamFlag } from '@/constants/wc2026Teams';
import { formatMatchDate } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';
import { useLeague, useIsFootball, type League } from '@/contexts/LeagueContext';
import { LeagueLogo, C_CRICKET_TAG, AccuracyBadge } from '@/components/home/HomeShared';
import { useAccuracy } from '@/hooks/useHome';
import { PredictionCardSkeleton } from '@/components/Skeleton';
import { PageLoader } from '@/components/PageLoader';
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

// ── League tag (used only on the merged All-Picks feed) ────────

function LeagueTag({ label }: { label: string }) {
  return (
    <View style={{
      backgroundColor: colors.cardElevated, borderRadius: 20,
      paddingHorizontal: 8, paddingVertical: 4,
      borderWidth: 1, borderColor: colors.border,
    }}>
      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
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

function MatchTipCard({ match, onPress, leagueLabel }: { match: MatchWithTip; onPress: () => void; leagueLabel?: string }) {
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
              {leagueLabel ? <LeagueTag label={leagueLabel} /> : null}
            </View>
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

function FootballTipCard({ match, onPress, leagueLabel }: { match: FootballMatchWithTip; onPress: () => void; leagueLabel?: string }) {
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accent + '12', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.accent + '30' }}>
                <Text style={{ fontSize: 12 }}>⚽</Text>
                <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{match.stage}</Text>
              </View>
              {leagueLabel ? <LeagueTag label={leagueLabel} /> : null}
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
      <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' }}>
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
  const { league, clearLeagueSelection } = useLeague();
  const isIPL = league.id === 'ipl';
  const { data: accuracy } = useAccuracy(league.id);
  return (
    <View style={{ marginBottom: spacing.xl, paddingTop: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2 }}>{league.short} {league.season}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        {accuracy && <AccuracyBadge percentage={accuracy.percentage} sampleSize={accuracy.sampleSize} compact />}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
          PredictX
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <BackToAllPill label="All Picks" onPress={clearLeagueSelection} />
          <LeagueSwitcher />
        </View>
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
  const { league, clearLeagueSelection } = useLeague();
  const { data: accuracy } = useAccuracy(league.id);
  const { data: footballMatches = [], isLoading: fbLoading, isFetching: fbFetching } = useFootballTips();
  const showFbSkeleton = fbLoading || (fbFetching && footballMatches.length === 0);

  return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PageLoader show={showFbSkeleton} />
        <SafeAreaView style={{ flex: 1 }}>
          <FlashList
            data={footballMatches}
            keyExtractor={(m) => String(m.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
            ListHeaderComponent={
              <View style={{ marginBottom: spacing.xl, paddingTop: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2 }}>⚽ FIFA WORLD CUP 2026</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  {accuracy && <AccuracyBadge percentage={accuracy.percentage} sampleSize={accuracy.sampleSize} compact />}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
                    PredictX
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <BackToAllPill label="All Picks" onPress={clearLeagueSelection} />
                    <LeagueSwitcher />
                  </View>
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
      <PageLoader show={showSkeleton} />
      <SafeAreaView style={{ flex: 1 }}>
        <FlashList
          data={matches}
          keyExtractor={(m) => String(m.id)}
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

// ── Cricket prediction-result resolver ──────────────────────────
// Mirrors the matches screen's resolvePredictionResult, adapted for the
// raw Match shape (team1/team2 objects) used by the tips feed instead of
// AdaptedMatch's flat team1Short/team1Name fields.

function resolveCricketTipResult(
  tipWinner: string | null | undefined,
  match: MatchWithTip,
): 'correct' | 'wrong' | null {
  const actualWinner = (match as any).winner as string | undefined;
  if (!actualWinner || !tipWinner) return null;
  const predicted = tipWinner.toLowerCase().trim();
  const t1s = match.team1.shortName.toLowerCase();
  const t2s = match.team2.shortName.toLowerCase();
  const t1n = match.team1.name.toLowerCase();
  const t2n = match.team2.name.toLowerCase();
  const actual = actualWinner.toLowerCase();

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

function resolveFootballTipResult(
  predictedWinner: string | null | undefined,
  match: FootballMatchWithTip,
): 'correct' | 'wrong' | null {
  const { home, away } = match.score;
  if (!predictedWinner || home === null || away === null) return null;

  const predicted = predictedWinner.toLowerCase().trim();
  const homeShort = match.homeTeam.shortName.toLowerCase();
  const awayShort = match.awayTeam.shortName.toLowerCase();
  const homeName  = match.homeTeam.name.toLowerCase();
  const awayName  = match.awayTeam.name.toLowerCase();

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
  if (predictedDraw) return 'wrong';
  if (predictedHome) return homeWon ? 'correct' : 'wrong';
  return homeWon ? 'wrong' : 'correct';
}

// ── Compact tip cards (small rectangular row) — used inside the
//    per-league accordion preview instead of the full-size cards. ──

function CompactCricketTipCard({ match, onPress }: { match: MatchWithTip; onPress: () => void }) {
  const t1 = match.team1, t2 = match.team2;
  const tip = match.tip;
  const c1 = getTeamColor(t1.shortName), c2 = getTeamColor(t2.shortName);
  const isCompleted = match.status === 'completed';
  const result = isCompleted ? resolveCricketTipResult(tip?.winner, match) : null;
  const winner = tip?.winner;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        backgroundColor: colors.cardElevated, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      })}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TeamLogo logo={t1.logo} short={t1.shortName} size={20} />
        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{t1.shortName}</Text>
      </View>
      <Text style={{ color: winner === t1.shortName ? c1 : colors.textMuted, fontSize: 11, fontWeight: '800', minWidth: 30, textAlign: 'right' }}>
        {tip ? `${tip.team1Pct}%` : '–'}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 9 }}>vs</Text>
      <Text style={{ color: winner === t2.shortName ? c2 : colors.textMuted, fontSize: 11, fontWeight: '800', minWidth: 30 }}>
        {tip ? `${tip.team2Pct}%` : '–'}
      </Text>
      <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <TeamLogo logo={t2.logo} short={t2.shortName} size={20} />
        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{t2.shortName}</Text>
      </View>
      {result && (
        <Ionicons
          name={result === 'correct' ? 'checkmark-circle' : 'close-circle'}
          size={15}
          color={result === 'correct' ? colors.success : colors.danger}
        />
      )}
    </Pressable>
  );
}

function CompactFootballTipCard({ match, onPress }: { match: FootballMatchWithTip; onPress: () => void }) {
  const tip = match.tip;
  const hColor = getWCColor(match.homeTeam.shortName);
  const aColor = getWCColor(match.awayTeam.shortName);
  const isCompleted = match.status === 'completed';
  const result = isCompleted ? resolveFootballTipResult(tip?.winner, match) : null;
  const winner = tip?.winner;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        backgroundColor: colors.cardElevated, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
        marginBottom: spacing.xs,
        flexDirection: 'row', alignItems: 'center', gap: 6,
      })}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TeamCrest logo={match.homeTeam.logo} flag={match.homeTeam.flag} size={20} />
        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{match.homeTeam.shortName}</Text>
      </View>
      <Text style={{ color: winner === match.homeTeam.shortName ? hColor : colors.textMuted, fontSize: 11, fontWeight: '800', minWidth: 30, textAlign: 'right' }}>
        {tip ? `${tip.homeWin}%` : '–'}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 9 }}>vs</Text>
      <Text style={{ color: winner === match.awayTeam.shortName ? aColor : colors.textMuted, fontSize: 11, fontWeight: '800', minWidth: 30 }}>
        {tip ? `${tip.awayWin}%` : '–'}
      </Text>
      <View style={{ flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
        <TeamCrest logo={match.awayTeam.logo} flag={match.awayTeam.flag} size={20} />
        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '700' }} numberOfLines={1}>{match.awayTeam.shortName}</Text>
      </View>
      {result && (
        <Ionicons
          name={result === 'correct' ? 'checkmark-circle' : 'close-circle'}
          size={15}
          color={result === 'correct' ? colors.success : colors.danger}
        />
      )}
    </Pressable>
  );
}

// ── Per-league accordion (All Picks feed) ───────────────────────
//
// Groups the merged feed by its actual league as a collapsible card —
// tap to reveal a preview split into upcoming predictions and recent
// results, with a "View all" link that jumps to that league's full
// PredictX screen.

const TIP_PREVIEW_COUNT = 3;

interface TipLeagueGroup {
  leagueId:    string;
  leagueShort: string;
  leagueName:  string;
  leagueFlag:  string;
  leagueImage?: string;
  sportColor:  string;
  priority:    number;
  items:       AllTipItem[];
}

function groupTipsByLeague(items: AllTipItem[], leagues: League[]): TipLeagueGroup[] {
  const order: string[] = [];
  const map = new Map<string, AllTipItem[]>();
  for (const item of items) {
    if (!map.has(item.leagueId)) { map.set(item.leagueId, []); order.push(item.leagueId); }
    map.get(item.leagueId)!.push(item);
  }
  const groups = order.map(leagueId => {
    const group  = map.get(leagueId)!;
    const league = leagues.find(l => l.id === leagueId);
    const isFootball = group[0].kind === 'football';
    return {
      leagueId,
      leagueShort: league?.short ?? group[0].leagueLabel,
      leagueName:  league?.name  ?? group[0].leagueLabel,
      leagueFlag:  league?.flag  ?? (isFootball ? '⚽' : '🏏'),
      leagueImage: league?.image,
      sportColor:  isFootball ? colors.accent : C_CRICKET_TAG,
      priority:    league?.priority ?? 0,
      items: group,
    };
  });

  // Admin-set "featured" leagues sort first. Among ties, ongoing leagues (a
  // live match right now) come next, then whichever league's next match is
  // soonest — so an active/in-progress league never gets buried below one
  // that's merely scheduled further out.
  return groups.sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    const aLive = a.items.some(i => i.match.status === 'live');
    const bLive = b.items.some(i => i.match.status === 'live');
    if (aLive !== bLive) return aLive ? -1 : 1;
    const aNext = Math.min(...a.items.map(i => new Date(i.match.date).getTime()));
    const bNext = Math.min(...b.items.map(i => new Date(i.match.date).getTime()));
    return aNext - bNext;
  });
}

function TipLeagueAccordion({
  leagueId, leagueShort, leagueName, leagueFlag, leagueImage, sportColor, items,
  defaultExpanded, onPress, onSeeAll,
}: TipLeagueGroup & {
  defaultExpanded?: boolean;
  onPress: (item: AllTipItem) => void; onSeeAll: (leagueId: string) => void;
}) {
  const [expanded, setExpanded] = useState(!!defaultExpanded);

  const upcoming  = items.filter(i => i.match.status !== 'completed').slice(0, TIP_PREVIEW_COUNT);
  const completed = items.filter(i => i.match.status === 'completed').slice(0, TIP_PREVIEW_COUNT);

  const top = items.find(i => i.match.status !== 'completed') ?? items[0];
  const topPct = top
    ? (top.kind === 'cricket'
        ? Math.max(top.match.tip?.team1Pct ?? 0, top.match.tip?.team2Pct ?? 0)
        : Math.max(top.match.tip?.homeWin ?? 0, top.match.tip?.awayWin ?? 0))
    : null;
  const topWinner = top?.match.tip?.winner ?? null;

  return (
    <View style={{
      marginBottom: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
      elevation: 1,
    }}>
      <Pressable
        onPress={() => setExpanded(v => !v)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.85 : 1,
          flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
          padding: spacing.md,
        })}
      >
        <LeagueLogo image={leagueImage} flag={leagueFlag} color={sportColor} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '800' }} numberOfLines={1}>
            {leagueName}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <View style={{ backgroundColor: sportColor + '15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
              <Text style={{ color: sportColor, fontSize: 9, fontWeight: '800', letterSpacing: 0.3 }}>{leagueShort}</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
              {items.length} pick{items.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {!expanded && top && topWinner && topPct != null && (
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
              Top pick: <Text style={{ color: sportColor, fontWeight: '700' }}>{topWinner}</Text> · {topPct}%
            </Text>
          )}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
      </Pressable>

      {expanded && (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          {upcoming.length > 0 && (
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 }}>
                UPCOMING PREDICTIONS
              </Text>
              {upcoming.map(item => (
                item.kind === 'cricket'
                  ? <CompactCricketTipCard key={item.match.id} match={item.match} onPress={() => onPress(item)} />
                  : <CompactFootballTipCard key={item.match.id} match={item.match} onPress={() => onPress(item)} />
              ))}
            </View>
          )}

          {completed.length > 0 && (
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.6, marginBottom: 6 }}>
                RECENT RESULTS
              </Text>
              {completed.map(item => (
                item.kind === 'cricket'
                  ? <CompactCricketTipCard key={item.match.id} match={item.match} onPress={() => onPress(item)} />
                  : <CompactFootballTipCard key={item.match.id} match={item.match} onPress={() => onPress(item)} />
              ))}
            </View>
          )}

          <Pressable
            onPress={() => onSeeAll(leagueId)}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: sportColor + '12', borderRadius: radius.md,
              paddingVertical: spacing.sm + 2,
            })}
          >
            <Text style={{ color: sportColor, fontSize: font.xs, fontWeight: '800' }}>
              View all {items.length} picks in {leagueShort}
            </Text>
            <Ionicons name="arrow-forward" size={13} color={sportColor} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Inline pill back to the All-Picks feed ───────────────────────
// Sits in the header row next to LeagueSwitcher (not floating over the
// header — an absolutely-positioned overlay used to collide with it).

function BackToAllPill({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: colors.card,
        borderRadius: 20, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: 10, paddingVertical: 7,
      })}
    >
      <Ionicons name="grid-outline" size={12} color={colors.accent} />
      <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// ── Skeleton accordion card — matches the real TipLeagueAccordion shape ──

function TipLeagueAccordionSkeleton() {
  return (
    <View style={{
      marginBottom: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg,
      borderWidth: 1, borderColor: colors.border,
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      padding: spacing.md,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: colors.cardElevated }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ width: '55%', height: 13, borderRadius: 4, backgroundColor: colors.cardElevated }} />
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View style={{ width: 36, height: 10, borderRadius: 4, backgroundColor: colors.cardElevated }} />
          <View style={{ width: 52, height: 10, borderRadius: 4, backgroundColor: colors.cardElevated }} />
        </View>
      </View>
      <View style={{ width: 18, height: 18, borderRadius: 4, backgroundColor: colors.cardElevated }} />
    </View>
  );
}

// ── All Picks screen (new, separate default — cricket + football,
//    every league merged into one feed) ─────────────────────────

function AllTipsScreen({ onPickLeague }: { onPickLeague: (id: string) => void }) {
  const router = useRouter();
  const { leagues } = useLeague();
  const { data: accuracy } = useAccuracy();
  const queryClient = useQueryClient();

  // Fire bundle first — one request replacing 8+ individual league calls.
  // Individual useAllTips queries are gated until bundle resolves so they
  // never race on the HTTP/1.1 connection limit.
  const bundle = useTipsBundle();
  const bundleResolved = bundle.isSuccess || bundle.isError;

  const { items, isLoading } = useAllTips({ enabled: bundleResolved });
  const showSkeleton = !bundleResolved || isLoading;

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['tips:bundle'] });
    await queryClient.invalidateQueries({ queryKey: ['tips:list'] });
    await queryClient.invalidateQueries({ queryKey: ['football:tips'] });
    setRefreshing(false);
  }, [queryClient]);

  function goToItem(item: AllTipItem) {
    if (item.kind === 'cricket') router.push(`/(tip-detail)/${item.match.id}`);
    else router.push(`/(tip-detail)/${item.match.id}?sport=football` as any);
  }

  const groups = groupTipsByLeague(items, leagues);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        >
          {/* Header — always visible, never blocked by loading */}
          <View style={{ marginBottom: spacing.xl, paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 2 }}>ALL LEAGUES</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 }}>
                PredictX
              </Text>
              {accuracy && <AccuracyBadge percentage={accuracy.percentage} sampleSize={accuracy.sampleSize} />}
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
                  AI predictions · Cricket & Football
                </Text>
              </View>
              {!showSkeleton && items.length > 0 && (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  {items.length} match{items.length !== 1 ? 'es' : ''} analysed
                </Text>
              )}
            </View>
          </View>

          {/* Skeleton placeholders while bundle loads */}
          {showSkeleton ? (
            <>
              <TipLeagueAccordionSkeleton />
              <TipLeagueAccordionSkeleton />
              <TipLeagueAccordionSkeleton />
              <TipLeagueAccordionSkeleton />
              <TipLeagueAccordionSkeleton />
            </>
          ) : groups.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderRadius: radius.xl,
              padding: spacing.xxxl, alignItems: 'center',
              borderWidth: 1, borderColor: colors.border, marginTop: spacing.xl,
            }}>
              <View style={{
                width: 64, height: 64, borderRadius: 20,
                backgroundColor: colors.accent + '12',
                borderWidth: 1, borderColor: colors.accent + '25',
                alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
              }}>
                <Ionicons name="analytics" size={28} color={colors.accent} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', marginBottom: spacing.sm }}>
                No Matches Yet
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 20 }}>
                PredictX predictions appear here as soon as matches are scheduled across any league
              </Text>
            </View>
          ) : (
            groups.map((g, i) => (
              <TipLeagueAccordion
                key={g.leagueId}
                {...g}
                defaultExpanded={i === 0}
                onPress={goToItem}
                onSeeAll={onPickLeague}
              />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────
//
// Follows the shared league-selection scope (LeagueContext.hasSelectedLeague)
// rather than its own local state, so it stays in sync with Home: picking a
// league (here, in Discovery, or in the league sheet) shows that league's
// PredictX picks; going back to "All Sports"/"All Picks" anywhere drops
// everyone back to the cross-league feed together.

export default function TipsScreen() {
  const { setLeagueId, hasSelectedLeague } = useLeague();
  const isFootball = useIsFootball();

  if (!hasSelectedLeague) {
    return <AllTipsScreen onPickLeague={setLeagueId} />;
  }

  return (
    <LeaguePickerGate>
      {isFootball ? <FootballTipsScreen /> : <CricketTipsScreen />}
    </LeaguePickerGate>
  );
}
