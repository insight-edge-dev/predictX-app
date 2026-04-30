import {
  View, Text, ScrollView, Pressable, Image,
  RefreshControl,
} from 'react-native';
import { NewsCardSkeleton, StandingRowSkeleton, RankingRowSkeleton } from '@/components/Skeleton';
import { API_BASE_URL } from '@/config/api';
import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLiveScores } from '@/hooks/useLiveScores';
import { useMatchCategories, useIPLTable } from '@/hooks/useMatches';
import { useHomeRankings, useHomeNews, type RankingPlayer, type NewsItem } from '@/hooks/useHome';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';
import { dedupeMatches } from '@/utils/matchAdapter';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import type { StandingsRow } from '@/services/matchService';

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

function LiveMatchCard({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
  const c1    = getTeamColor(match.team1Short);
  const c2    = getTeamColor(match.team2Short);
  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1, marginBottom: spacing.xl })}>
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', elevation: 12, shadowColor: colors.live, shadowOpacity: 0.25, shadowRadius: 16 }}>
        {/* Team color bar */}
        <View style={{ height: 4, flexDirection: 'row' }}>
          <View style={{ flex: 1, backgroundColor: c1 }} />
          <View style={{ flex: 1, backgroundColor: c2 }} />
        </View>
        <LinearGradient colors={['#101828', '#0A1120']} style={{ borderWidth: 1, borderTopWidth: 0, borderColor: colors.live + '25', padding: spacing.xl }}>
          {/* Live badge */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.live + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: colors.live + '35' }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
              <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>LIVE NOW</Text>
            </View>
            <View style={{ backgroundColor: colors.cardElevated, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' }}>{match.matchDesc}</Text>
            </View>
          </View>

          {/* Teams + Scores */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c1 + '15', borderWidth: 2, borderColor: c1 + '35', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo1} shortName={match.team1Short} size={52} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>{match.team1Short}</Text>
              {match.score1
                ? <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>{match.score1}</Text>
                : <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Yet to bat</Text>}
              {match.overs1 && <Text style={{ color: colors.textMuted, fontSize: font.xs }}>({match.overs1} ov)</Text>}
            </View>

            <View style={{ paddingHorizontal: spacing.md }}>
              <Text style={{ color: colors.textMuted + '50', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>VS</Text>
            </View>

            <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c2 + '15', borderWidth: 2, borderColor: c2 + '35', alignItems: 'center', justifyContent: 'center' }}>
                <TeamLogo logoUri={logo2} shortName={match.team2Short} size={52} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>{match.team2Short}</Text>
              {match.score2
                ? <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>{match.score2}</Text>
                : <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Yet to bat</Text>}
              {match.overs2 && <Text style={{ color: colors.textMuted, fontSize: font.xs }}>({match.overs2} ov)</Text>}
            </View>
          </View>

          {match.statusText ? (
            <View style={{ marginTop: spacing.lg, backgroundColor: colors.live + '10', borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14, borderLeftWidth: 3, borderLeftColor: colors.live }}>
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '500', textAlign: 'center', lineHeight: 20 }} numberOfLines={2}>{match.statusText}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.md, gap: 4 }}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>{match.venue}</Text>
          </View>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

// ── NextMatchCard ─────────────────────────────────────────────

function NextMatchCard({ match, onPress }: { match: AdaptedMatch; onPress: () => void }) {
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
      <View style={{ borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' }}>

        {/* ── Full-bleed background: horizontal team color split ── */}
        <LinearGradient
          colors={[c1 + '55', c1 + '22', '#07080F', c2 + '22', c2 + '55']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Frosted glass overlay */}
        <BlurView intensity={32} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        {/* Extra dark centre to keep content readable */}
        <LinearGradient
          colors={['transparent', 'rgba(4,6,14,0.55)', 'rgba(4,6,14,0.55)', 'transparent']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* ── Content ── */}
        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 0 }}>

          {/* Top colour bar */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, flexDirection: 'row' }}>
            <View style={{ flex: 1, backgroundColor: c1 }} />
            <View style={{ flex: 1, backgroundColor: c2 }} />
          </View>

          {/* Row 1: status + match label */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5,
              backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 4,
              borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }} />
              <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>UPCOMING</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: font.xs, fontWeight: '600' }}>{match.matchDesc}</Text>
            </View>
          </View>

          {/* Row 2: Team1 — Centre — Team2 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl }}>

            {/* Team 1 */}
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 86, height: 86, borderRadius: 43,
                backgroundColor: c1 + '25',
                borderWidth: 2.5, borderColor: c1,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: c1, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
              }}>
                <TeamLogo logoUri={logo1} shortName={match.team1Short} size={62} />
              </View>
              <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '900', letterSpacing: 0.5 }}>{match.team1Short}</Text>
            </View>

            {/* Centre block */}
            <View style={{ alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm }}>
              {/* VS badge */}
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5,
                borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.50)', fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>VS</Text>
              </View>
              {/* Date */}
              {dateLabel ? (
                <Text style={{ color: 'rgba(255,255,255,0.40)', fontSize: font.xs, fontWeight: '600' }}>{dateLabel}</Text>
              ) : null}
              {/* Time — the hero element */}
              <View style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10,
                borderWidth: 1.5, borderColor: colors.accent + '70',
                alignItems: 'center',
              }}>
                <Text style={{ color: colors.accent, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>{match.time}</Text>
              </View>
            </View>

            {/* Team 2 */}
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 86, height: 86, borderRadius: 43,
                backgroundColor: c2 + '25',
                borderWidth: 2.5, borderColor: c2,
                alignItems: 'center', justifyContent: 'center',
                shadowColor: c2, shadowOpacity: 0.6, shadowRadius: 16, elevation: 10,
              }}>
                <TeamLogo logoUri={logo2} shortName={match.team2Short} size={62} />
              </View>
              <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '900', letterSpacing: 0.5 }}>{match.team2Short}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: -spacing.xl }} />

          {/* Row 3: venue + CTA */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: spacing.sm }}>
            <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.30)" />
            <Text style={{ flex: 1, color: 'rgba(255,255,255,0.30)', fontSize: font.xs }} numberOfLines={1}>
              {match.venue}
            </Text>
            <Pressable
              onPress={onPress}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: colors.accent,
                borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
                shadowColor: colors.accent, shadowOpacity: 0.55, shadowRadius: 10, elevation: 6,
              })}
            >
              <Ionicons name="sparkles" size={12} color="#07080F" />
              <Text style={{ color: '#07080F', fontSize: font.xs, fontWeight: '800' }}>Prediction</Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Pressable>
  );
}

// ── TournamentStrip ───────────────────────────────────────────

function TournamentStrip({ rows }: { rows: StandingsRow[] }) {
  if (!rows.length) return null;
  const leader   = rows[0];
  const played   = rows.reduce((s, r) => s + (r.played ?? 0), 0);
  const total    = 74; // IPL 2026 total matches
  const pct      = Math.min(100, Math.round((played / total) * 100));
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

function QuickActions({ onFixtures, onTips, onStandings }: { onFixtures: () => void; onTips: () => void; onStandings: () => void }) {
  const actions = [
    { icon: 'calendar-outline' as const,  label: 'Schedule',  onPress: onFixtures,   color: '#60A5FA' },
    { icon: 'analytics-outline' as const, label: 'Predict',   onPress: onTips,       color: colors.accent },
    { icon: 'trophy-outline' as const,    label: 'Standings', onPress: onStandings,  color: colors.success },
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
          <Image source={{ uri: imgUri }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
          <LinearGradient colors={['transparent', 'rgba(7,8,15,0.95)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg }}>
            {item.storyType && (
              <View style={{ backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start', marginBottom: 6 }}>
                <Text style={{ color: colors.bg, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>{item.storyType.toUpperCase()}</Text>
              </View>
            )}
            <Text style={{ color: '#fff', fontSize: font.md, fontWeight: '700', lineHeight: 20 }} numberOfLines={2}>{item.title}</Text>
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 4 }}>{item.context || item.source} · Cricbuzz</Text>
          </LinearGradient>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing.sm, flexDirection: 'row' }}>
        {imgUri
          ? <Image source={{ uri: imgUri }} style={{ width: 88, height: 84 }} resizeMode="cover" />
          : <View style={{ width: 88, height: 84, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }}>
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

// ── RankingsSection ───────────────────────────────────────────

function RankingsSection({ players }: { players: RankingPlayer[] }) {
  const medalColors = ['#F59E0B', '#94A3B8', '#B45309'];
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
      {players.slice(0, 5).map((p, idx) => {
        const trend  = trendIcon(p.trend);
        const isTop3 = idx < 3;
        return (
          <View key={p.id + idx} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: idx < 4 ? 1 : 0, borderBottomColor: colors.border }}>
            <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: isTop3 ? medalColors[idx] + '18' : colors.cardElevated, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, borderWidth: isTop3 ? 1 : 0, borderColor: isTop3 ? medalColors[idx] + '40' : 'transparent' }}>
              <Text style={{ color: isTop3 ? medalColors[idx] : colors.textMuted, fontSize: font.xs, fontWeight: '800' }}>{p.rank}</Text>
            </View>
            {p.imageUrl
              ? <Image source={{ uri: p.imageUrl }} style={{ width: 38, height: 38, borderRadius: 19, marginRight: spacing.sm }} />
              : <View style={{ width: 38, height: 38, borderRadius: 19, marginRight: spacing.sm, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={18} color={colors.textMuted} />
                </View>
            }
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>{p.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }}>{p.country}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '800' }}>{p.rating}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Ionicons name={trend.name} size={9} color={trend.color} />
                <Text style={{ color: trend.color, fontSize: 9, fontWeight: '600' }}>{p.trend}</Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function HomeScreen() {
  const router  = useRouter();
  const [rankTab,    setRankTab]    = useState<'batting' | 'bowling'>('batting');
  const [refreshing, setRefreshing] = useState(false);

  const { getLiveScore, scores: wsScores, connected: wsConnected } = useLiveScores();
  const { liveMatches, upcomingMatches, completedMatches, refetch } = useMatchCategories();
  const { data: tableRows = [], isLoading: tableLoading }           = useIPLTable();
  const { data: rankings,  isLoading: rankLoading }                 = useHomeRankings();
  const { data: news = [],  isLoading: newsLoading }                = useHomeNews();

  const effectiveLive = useMemo(() => {
    // When WS is connected it is authoritative: empty scores = no live matches
    if (wsConnected) {
      if (wsScores.size === 0) return [];
      const all = dedupeMatches([...liveMatches, ...upcomingMatches]);
      return all
        .filter(m => getLiveScore(m.team1Short, m.team2Short)?.status === 'live')
        .map(m => {
          const s = getLiveScore(m.team1Short, m.team2Short);
          if (!s) return m;
          return { ...m, score1: s.score1 ?? m.score1, score2: s.score2 ?? m.score2, overs1: s.overs1 ?? m.overs1, overs2: s.overs2 ?? m.overs2, statusText: s.statusText || m.statusText, status: 'live' as const, isLive: true, isUpcoming: false, isCompleted: false };
        });
    }
    // WS not yet connected: fall back to REST data
    return liveMatches;
  }, [liveMatches, upcomingMatches, getLiveScore, wsScores, wsConnected]);

  const liveMatch = effectiveLive[0] ?? null;

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const goMatch     = useCallback((id: string) => router.push(`/(match-details)/${id}`), [router]);
  const goFixtures  = useCallback(() => router.push('/(tabs)/(matches)'), [router]);
  const goTips      = useCallback(() => router.push('/(tabs)/(tips)'), [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
                  <View style={{ backgroundColor: colors.accent + '18', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.accent + '30' }}>
                    <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '800', letterSpacing: 1 }}>IPL 2026</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{formatDate()}</Text>
                </View>
                <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 }}>CricketIQ</Text>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>{greeting()}, let's talk cricket</Text>
              </View>
              {liveMatch && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.live + '15', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.live + '30', marginTop: 4 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.live }} />
                  <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '800', letterSpacing: 0.5 }}>LIVE</Text>
                </View>
              )}
            </View>

            {/* ── Quick Actions ── */}
            <QuickActions onFixtures={goFixtures} onTips={goTips} onStandings={goFixtures} />

            {/* ── Hero Match (Live OR Next Up) ── */}
            {liveMatch ? (
              <>
                <SectionHeader title="Live Match" accent={colors.live} />
                <LiveMatchCard match={liveMatch} onPress={() => goMatch(liveMatch.id)} />
              </>
            ) : nextMatch ? (
              <>
                <SectionHeader title="Next Match" accent={colors.accent} />
                <NextMatchCard match={nextMatch} onPress={() => goMatch(nextMatch.id)} />
              </>
            ) : null}

            {/* ── Tournament Strip ── */}
            {tableRows.length > 0 && <TournamentStrip rows={tableRows} />}

            {/* ── More Upcoming ── */}
            {moreUpcoming.length > 0 && (
              <View style={{ marginBottom: spacing.xl }}>
                <SectionHeader title="Upcoming Matches" onMore={goFixtures} moreLabel="Full Schedule" />
                {moreUpcoming.map(m => (
                  <UpcomingMatchRow key={m.id} match={m} onPress={() => goMatch(m.id)} />
                ))}
              </View>
            )}

            {/* ── Cricket News ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="Cricket News" />
              {newsLoading ? (
                <>
                  <NewsCardSkeleton featured />
                  <NewsCardSkeleton />
                  <NewsCardSkeleton />
                </>
              ) : news.length === 0 ? (
                <View style={{ backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, fontSize: font.sm }}>No news available</Text>
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

            {/* ── IPL Standings ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="IPL 2026 Standings" onMore={goFixtures} moreLabel="Full Table" />
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

            {/* ── ICC T20 Rankings ── */}
            <View style={{ marginBottom: spacing.xl }}>
              <SectionHeader title="ICC T20 Rankings" />
              <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md }}>
                {(['batting', 'bowling'] as const).map(t => (
                  <Pressable key={t} onPress={() => setRankTab(t)} style={{ flex: 1, paddingVertical: 9, borderRadius: radius.sm, backgroundColor: rankTab === t ? colors.accent : 'transparent', alignItems: 'center' }}>
                    <Text style={{ color: rankTab === t ? colors.bg : colors.textSecondary, fontSize: font.xs, fontWeight: '700', textTransform: 'capitalize' }}>{t}</Text>
                  </Pressable>
                ))}
              </View>
              {rankLoading
                ? <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                    {[0,1,2,3,4].map(i => <RankingRowSkeleton key={i} />)}
                  </View>
                : <RankingsSection players={rankTab === 'batting' ? (rankings?.batsmen ?? []) : (rankings?.bowlers ?? [])} />
              }
              <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center', marginTop: spacing.md }}>
                ICC T20I Rankings · Updated periodically
              </Text>
            </View>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
