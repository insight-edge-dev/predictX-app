import {
  View, Text, Pressable, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMatchTip } from '@/hooks/useTips';
import { getTeamColor, getTeamLogo } from '@/theme/colors';
import { formatMatchDate } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';
import type {
  TipFactor, BatterStat, BowlerStat, SeasonForm, H2HData, VenueInsights,
} from '@/services/tipsService';

// ── Atoms ─────────────────────────────────────────────────────

function TeamLogo({ logo, short, size }: { logo: string; short: string; size: number }) {
  const url   = getTeamLogo(logo ?? '', short);
  const color = getTeamColor(short);
  if (url) return <Image source={{ uri: url }} style={{ width: size, height: size }} resizeMode="contain" />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '25', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.35, fontWeight: '700' }}>{short}</Text>
    </View>
  );
}

function ConfidenceBadge({ label }: { label: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const color = label === 'HIGH' ? colors.success : label === 'MEDIUM' ? colors.warning : colors.textSecondary;
  return (
    <View style={{ backgroundColor: color + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: color + '40' }}>
      <Text style={{ color, fontSize: font.xs, fontWeight: '700', letterSpacing: 1 }}>{label} CONFIDENCE</Text>
    </View>
  );
}

function SectionCard({ title, children, noPad }: { title: string; children: React.ReactNode; noPad?: boolean }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1.5 }}>{title}</Text>
      </View>
      <View style={noPad ? {} : { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border + '50', marginVertical: 2 }} />;
}

// ── H2H Visual Bar ────────────────────────────────────────────

function H2HBar({ h2h, t1, t2, c1, c2 }: { h2h: H2HData; t1: string; t2: string; c1: string; c2: string }) {
  const t1w = `${h2h.team1WinPct}%` as any;
  const t2w = `${h2h.team2WinPct}%` as any;
  return (
    <View>
      {/* Win numbers */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.sm }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: c1, fontSize: 28, fontWeight: '800' }}>{h2h.team1Wins}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{t1} WINS</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>{h2h.total} played</Text>
          {h2h.noResult > 0 && <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{h2h.noResult} NR</Text>}
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: c2, fontSize: 28, fontWeight: '800' }}>{h2h.team2Wins}</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{t2} WINS</Text>
        </View>
      </View>
      {/* Bar */}
      <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.border, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ width: t1w, backgroundColor: c1 }} />
        <View style={{ flex: 1, backgroundColor: c2 }} />
      </View>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ color: c1, fontSize: font.xs, fontWeight: '700' }}>{h2h.team1WinPct}%</Text>
        <Text style={{ color: c2, fontSize: font.xs, fontWeight: '700' }}>{h2h.team2WinPct}%</Text>
      </View>
    </View>
  );
}

// ── Factor Row ────────────────────────────────────────────────

function FactorRow({ factor, c1, c2 }: { factor: TipFactor; c1: string; c2: string }) {
  const adv = factor.advantage;
  return (
    <View style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border + '40' }}>
      <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 }}>
        {factor.label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {adv === 'team1' && <Ionicons name="star" size={10} color={c1} />}
            <Text style={{ color: adv === 'team1' ? c1 : colors.textSecondary, fontSize: font.sm, fontWeight: adv === 'team1' ? '700' : '500' }}>
              {factor.team1Value}
            </Text>
          </View>
        </View>
        <View style={{ alignItems: 'center', paddingHorizontal: spacing.sm }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: adv === 'neutral' ? colors.border : adv === 'team1' ? c1 : c2 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: adv === 'team2' ? c2 : colors.textSecondary, fontSize: font.sm, fontWeight: adv === 'team2' ? '700' : '500' }}>
              {factor.team2Value}
            </Text>
            {adv === 'team2' && <Ionicons name="star" size={10} color={c2} />}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Season form dots ──────────────────────────────────────────

function SeasonFormDots({ seasons, color }: { seasons: SeasonForm[]; color: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      {seasons.map(s => {
        const winPct = s.winPct;
        const barW   = `${winPct}%` as any;
        return (
          <View key={s.season} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: font.xs, width: 32 }}>{s.season}</Text>
            <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' }}>
              <View style={{ width: barW, height: 6, borderRadius: 3, backgroundColor: color + 'CC' }} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: font.xs, width: 48, textAlign: 'right' }}>
              {s.wins}W {s.losses}L
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Venue Insight Tile ────────────────────────────────────────

function VenueTile({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.cardElevated, borderRadius: radius.sm, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border }}>
      <Ionicons name={icon as any} size={16} color={colors.accent} />
      <Text style={{ color: '#fff', fontSize: font.xl, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center', lineHeight: 14 }}>{label}</Text>
    </View>
  );
}

// ── Batter Row ────────────────────────────────────────────────

function BatterRow({ p, color }: { p: BatterStat; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '30' }}>
      <View style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: color, marginRight: spacing.sm }} />
      <Text style={{ flex: 1, color: '#fff', fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>{p.player}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View style={{ alignItems: 'center', minWidth: 32 }}>
          <Text style={{ color: '#fff', fontSize: font.sm, fontWeight: '700' }}>{p.runs}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>RUNS</Text>
        </View>
        <View style={{ alignItems: 'center', minWidth: 36 }}>
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>{p.strikeRate.toFixed(0)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>S/R</Text>
        </View>
        <View style={{ alignItems: 'center', minWidth: 36 }}>
          <Text style={{ color: colors.success, fontSize: font.sm, fontWeight: '700' }}>{p.average.toFixed(1)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>AVG</Text>
        </View>
      </View>
    </View>
  );
}

// ── Bowler Row ────────────────────────────────────────────────

function BowlerRow({ p, color }: { p: BowlerStat; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + '30' }}>
      <View style={{ width: 4, height: 28, borderRadius: 2, backgroundColor: color, marginRight: spacing.sm }} />
      <Text style={{ flex: 1, color: '#fff', fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>{p.player}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.lg }}>
        <View style={{ alignItems: 'center', minWidth: 36 }}>
          <Text style={{ color: colors.success, fontSize: font.sm, fontWeight: '700' }}>{p.wickets}W</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>WKTS</Text>
        </View>
        <View style={{ alignItems: 'center', minWidth: 36 }}>
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>{p.economy.toFixed(1)}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 9 }}>ECON</Text>
        </View>
      </View>
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────

function SkeletonBlock({ h = 16, br = 6, mb = 8, w = '100%' }: any) {
  return <View style={{ width: w, height: h, borderRadius: br, backgroundColor: colors.cardElevated, marginBottom: mb }} />;
}

// ── Main screen ───────────────────────────────────────────────

export default function TipDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { data, isLoading, isError, refetch } = useMatchTip(id ?? '');

  const BackBtn = (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.bg }}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center' })} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontSize: font.md, fontWeight: '600', marginLeft: 2 }}>Predictions</Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {BackBtn}
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <SkeletonBlock h={200} br={radius.xl} mb={spacing.md} />
          <SkeletonBlock h={160} br={radius.lg} mb={spacing.md} />
          <SkeletonBlock h={140} br={radius.lg} mb={spacing.md} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        {BackBtn}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl }}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.danger} />
          <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700', marginTop: spacing.lg, marginBottom: spacing.xl }}>Failed to load prediction</Text>
          <Pressable onPress={() => refetch()} style={{ backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 32, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const { match, tip } = data;
  const t1 = match.team1;
  const t2 = match.team2;
  const c1 = getTeamColor(t1.shortName);
  const c2 = getTeamColor(t2.shortName);
  const tp = tip.topPerformers;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {BackBtn}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 80 }}>

        {/* ── Hero prediction card ── */}
        <LinearGradient
          colors={[c1 + '22', colors.card, colors.card, c2 + '22']}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={{ borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.md }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="sparkles" size={12} color={colors.accent} />
              <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 1 }}>AI PREDICTION</Text>
            </View>
            <ConfidenceBadge label={tip.confidenceLabel} />
          </View>

          {/* Teams + % */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <TeamLogo logo={t1.logo} short={t1.shortName} size={64} />
              <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700' }}>{t1.shortName}</Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: tip.team1Pct >= tip.team2Pct ? c1 : colors.textSecondary }}>
                {tip.team1Pct}%
              </Text>
            </View>
            <Text style={{ color: colors.textMuted + '50', fontSize: font.xxl, fontWeight: '900', paddingHorizontal: spacing.sm }}>VS</Text>
            <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
              <TeamLogo logo={t2.logo} short={t2.shortName} size={64} />
              <Text style={{ color: '#fff', fontSize: font.lg, fontWeight: '700' }}>{t2.shortName}</Text>
              <Text style={{ fontSize: 36, fontWeight: '800', color: tip.team2Pct >= tip.team1Pct ? c2 : colors.textSecondary }}>
                {tip.team2Pct}%
              </Text>
            </View>
          </View>

          {/* Probability bar */}
          <View style={{ marginTop: spacing.xl, height: 8, borderRadius: 4, backgroundColor: colors.border, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ width: `${tip.team1Pct}%` as any, backgroundColor: c1 }} />
            <View style={{ flex: 1, backgroundColor: c2 + '90' }} />
          </View>

          {/* Winner callout */}
          <View style={{ marginTop: spacing.lg, alignItems: 'center' }}>
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Predicted Winner</Text>
            <Text style={{ color: '#fff', fontSize: font.xl, fontWeight: '800', marginTop: 3 }}>
              {tip.winner === t1.shortName ? t1.name : t2.name}
            </Text>
          </View>

          {/* Date + venue */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm, flexWrap: 'wrap' }}>
            <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>{formatMatchDate(match.date)}</Text>
            <Text style={{ color: colors.border }}>•</Text>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>{match.venue}</Text>
          </View>
        </LinearGradient>

        {/* ── Head to Head ── */}
        {tip.h2hData && (
          <SectionCard title="HEAD TO HEAD">
            <H2HBar h2h={tip.h2hData} t1={t1.shortName} t2={t2.shortName} c1={c1} c2={c2} />
          </SectionCard>
        )}

        {/* ── Key Factors ── */}
        {tip.factors.length > 0 && (
          <SectionCard title="KEY FACTORS">
            {/* Column headers */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border + '40' }}>
              <Text style={{ color: c1, fontSize: font.xs, fontWeight: '700' }}>{t1.shortName}</Text>
              <Text style={{ color: c2, fontSize: font.xs, fontWeight: '700' }}>{t2.shortName}</Text>
            </View>
            {tip.factors.map(f => <FactorRow key={f.label} factor={f} c1={c1} c2={c2} />)}
          </SectionCard>
        )}

        {/* ── Venue Insights ── */}
        {tip.venueInsights && (
          <SectionCard title={`VENUE INSIGHTS — ${tip.venueInsights.venueName.split(',')[0]}`} noPad>
            <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              <VenueTile icon="stats-chart-outline"         value={`${tip.venueInsights.avgFirstInningsScore}`} label={'Avg 1st\nInnings'} />
              <VenueTile icon="arrow-up-circle-outline"     value={`${tip.venueInsights.batFirstWinPct}%`}      label={'Bat First\nWins'} />
              <VenueTile icon="arrow-down-circle-outline"   value={`${tip.venueInsights.chaseWinPct}%`}         label={'Chase\nWins'} />
              <VenueTile icon="shuffle-outline"             value={`${tip.venueInsights.tossWinnerWinPct}%`}    label={'Toss Winner\nWins'} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
              Based on {tip.venueInsights.totalMatches} IPL matches at this ground
            </Text>
          </SectionCard>
        )}

        {/* ── Season Form ── */}
        {(tip.recentForm.team1.length > 0 || tip.recentForm.team2.length > 0) && (
          <SectionCard title="SEASON FORM (LAST 5 YEARS)">
            <View style={{ flexDirection: 'row', gap: spacing.lg }}>
              {tip.recentForm.team1.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c1, fontSize: font.xs, fontWeight: '700', marginBottom: spacing.sm }}>{t1.shortName}</Text>
                  <SeasonFormDots seasons={tip.recentForm.team1} color={c1} />
                </View>
              )}
              {tip.recentForm.team2.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c2, fontSize: font.xs, fontWeight: '700', marginBottom: spacing.sm }}>{t2.shortName}</Text>
                  <SeasonFormDots seasons={tip.recentForm.team2} color={c2} />
                </View>
              )}
            </View>
          </SectionCard>
        )}

        {/* ── Top Batters vs Each Team ── */}
        {(tp.battersVsT2.length > 0 || tp.battersVsT1.length > 0) && (
          <SectionCard title="ALL-TIME TOP BATTERS VS OPPOSITION" noPad>
            {tp.battersVsT2.length > 0 && (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Text style={{ color: c2, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, paddingVertical: spacing.sm }}>
                  TOP SCORERS vs {t2.shortName}
                </Text>
                {tp.battersVsT2.map(p => <BatterRow key={p.player} p={p} color={c1} />)}
              </View>
            )}
            {tp.battersVsT1.length > 0 && (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: tp.battersVsT2.length > 0 ? spacing.lg : 0 }}>
                <Text style={{ color: c1, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, paddingVertical: spacing.sm }}>
                  TOP SCORERS vs {t1.shortName}
                </Text>
                {tp.battersVsT1.map(p => <BatterRow key={p.player} p={p} color={c2} />)}
              </View>
            )}
            <View style={{ height: spacing.lg }} />
          </SectionCard>
        )}

        {/* ── Top Bowlers vs Each Team ── */}
        {(tp.bowlersVsT2.length > 0 || tp.bowlersVsT1.length > 0) && (
          <SectionCard title="ALL-TIME TOP BOWLERS VS OPPOSITION" noPad>
            {tp.bowlersVsT2.length > 0 && (
              <View style={{ paddingHorizontal: spacing.lg }}>
                <Text style={{ color: c2, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, paddingVertical: spacing.sm }}>
                  TOP WICKET-TAKERS vs {t2.shortName}
                </Text>
                {tp.bowlersVsT2.map(p => <BowlerRow key={p.player} p={p} color={c1} />)}
              </View>
            )}
            {tp.bowlersVsT1.length > 0 && (
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: tp.bowlersVsT2.length > 0 ? spacing.lg : 0 }}>
                <Text style={{ color: c1, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, paddingVertical: spacing.sm }}>
                  TOP WICKET-TAKERS vs {t1.shortName}
                </Text>
                {tp.bowlersVsT1.map(p => <BowlerRow key={p.player} p={p} color={c2} />)}
              </View>
            )}
            <View style={{ height: spacing.lg }} />
          </SectionCard>
        )}

        {/* ── Disclaimer ── */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.cardElevated, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, lineHeight: 18 }}>
            Predictions use IPL data (2008–2025) and current season form. For entertainment purposes only.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
