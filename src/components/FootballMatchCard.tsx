import { View, Text, Pressable, Animated } from 'react-native';
import { memo, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { FootballMatch, WCStage } from '@/types/football';
import { colors, spacing, font, radius } from '@/constants/theme';
import { PredictionBadge } from '@/components/MatchCard';
import { TeamCrest } from '@/components/TeamCrest';

// ── Pulsing live dot ──────────────────────────────────────────────

function LiveDot({ size = 6 }: { size?: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.live, opacity }} />
  );
}

// ── Stage badge colors ────────────────────────────────────────────

const STAGE_COLORS: Record<WCStage, { bg: string; text: string }> = {
  'Group Stage':   { bg: '#F3F4F6', text: '#6B7280' },
  'Round of 32':  { bg: '#EFF6FF', text: '#2563EB' },
  'Round of 16':  { bg: '#EFF6FF', text: '#2563EB' },
  'Quarter-Final': { bg: '#FFF7ED', text: '#EA580C' },
  'Semi-Final':   { bg: '#F5F3FF', text: '#7C3AED' },
  '3rd Place':    { bg: '#F0FDF4', text: '#16A34A' },
  'Final':        { bg: '#FFFBEB', text: '#D97706' },
};

function StageBadge({ stage }: { stage: WCStage }) {
  const c = STAGE_COLORS[stage] ?? STAGE_COLORS['Group Stage'];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ color: c.text, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.3 }}>
        {stage}
      </Text>
    </View>
  );
}

// ── Team column ───────────────────────────────────────────────────

function TeamColumn({
  logo, shortName, flag, color, isWinner,
}: {
  logo: string; shortName: string; flag: string; color: string; isWinner: boolean;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
        <TeamCrest logo={logo} flag={flag} size={36} />
      </View>
      <Text style={{ color: isWinner ? colors.textPrimary : colors.textSecondary, fontSize: font.sm, fontWeight: isWinner ? '700' : '500' }} numberOfLines={1}>
        {flag} {shortName}
      </Text>
    </View>
  );
}

// ── Press animation ───────────────────────────────────────────────

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); Animated.spring(scale, { toValue: 0.984, useNativeDriver: true, speed: 50, bounciness: 3 }).start(); };
  const onPressOut = () => { Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 3 }).start(); };
  return { scale, onPressIn, onPressOut };
}

// ── FootballMatchCard ─────────────────────────────────────────────

export const FootballMatchCard = memo(function FootballMatchCard({
  match,
  onPress,
  predictionResult,
  expertPredictionResult,
}: {
  match:                   FootballMatch;
  onPress?:                (id: string) => void;
  predictionResult?:       'correct' | 'wrong' | null;
  expertPredictionResult?: 'correct' | 'wrong' | null;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const router = useRouter();

  const isLive      = match.status === 'live';
  const isUpcoming  = match.status === 'upcoming';
  const isCompleted = match.status === 'completed';

  const homeGoals = match.score.home;
  const awayGoals = match.score.away;
  const homeWins  = isCompleted && homeGoals !== null && awayGoals !== null && homeGoals > awayGoals;
  const awayWins  = isCompleted && homeGoals !== null && awayGoals !== null && awayGoals > homeGoals;

  const scoreText = (homeGoals !== null && awayGoals !== null)
    ? `${homeGoals} - ${awayGoals}`
    : '- vs -';

  const htText = (match.score.htHome !== null && match.score.htAway !== null)
    ? `HT ${match.score.htHome}-${match.score.htAway}`
    : null;

  return (
    <Pressable
      onPress={() => onPress ? onPress(match.id) : router.push(`/(match-details)/${match.id}?sport=football` as any)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={{
          transform: [{ scale }],
          marginBottom: spacing.sm,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 1,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: isLive ? '#FECACA' : colors.border,
            overflow: 'hidden',
          }}
        >
          {isLive && <View style={{ height: 2, backgroundColor: colors.live }} />}

          {/* ── Header ───────────────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <StageBadge stage={match.stage} />
              {match.group && (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  Group {match.group}
                </Text>
              )}
            </View>

            {isLive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <LiveDot />
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
                  {match.minute ? `${match.minute}'` : match.statusText}
                </Text>
              </View>
            )}
            {isUpcoming && (
              <Text style={{ color: colors.warning, fontSize: font.sm, fontWeight: '600' }}>
                {match.time}
              </Text>
            )}
            {isCompleted && (
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>
                {match.statusText}
              </Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* ── Teams + Score ─────────────────────────── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.lg }}>
            <TeamColumn
              logo={match.homeTeam.logo}
              shortName={match.homeTeam.shortName}
              flag={match.homeTeam.flag}
              color={match.homeTeam.color}
              isWinner={homeWins}
            />

            <View style={{ paddingHorizontal: spacing.md, alignItems: 'center', gap: 4 }}>
              <Text
                style={{
                  color: isUpcoming ? colors.textMuted : colors.textPrimary,
                  fontSize: isUpcoming ? font.md : font.xl,
                  fontWeight: '800',
                  letterSpacing: 2,
                  minWidth: 60,
                  textAlign: 'center',
                }}
              >
                {scoreText}
              </Text>
              {htText && (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  {htText}
                </Text>
              )}
            </View>

            <TeamColumn
              logo={match.awayTeam.logo}
              shortName={match.awayTeam.shortName}
              flag={match.awayTeam.flag}
              color={match.awayTeam.color}
              isWinner={awayWins}
            />
          </View>

          {/* ── Footer ────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.sm + 1 }}>
            <Ionicons name="location-outline" size={10} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
              {match.city || match.venue}
            </Text>
          </View>

          {/* ── Prediction badges ────────────────────────── */}
          {isCompleted && (predictionResult != null || expertPredictionResult != null) && (
            <View
              style={{
                flexDirection:  'row',
                flexWrap:       'wrap',
                gap:            spacing.sm,
                paddingHorizontal: spacing.lg,
                paddingBottom:  spacing.md,
              }}
            >
              {predictionResult != null && (
                <PredictionBadge label="AI" result={predictionResult} />
              )}
              {expertPredictionResult != null && (
                <PredictionBadge label="Expert" result={expertPredictionResult} />
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
});
