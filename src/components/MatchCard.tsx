/**
 * MatchCard.tsx — PredictX match card components.
 *
 * Design: Cricbuzz-style compact cards. White card, horizontal team rows,
 * minimal decoration, information-dense layout.
 *
 * Exported components:
 *   MatchCard         — compact horizontal card (primary)
 *   FeaturedMatchCard — slightly larger hero card for home screen
 */

import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { memo, useRef, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import { getTeamLogo, getTeamColor } from '@/theme/colors';
import { formatMatchDate, getMatchCountdown } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';
import { useLeague } from '@/contexts/LeagueContext';

// ── Pulsing live dot ──────────────────────────────────────────

function LiveDot({ size = 6 }: { size?: number }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.live,
        opacity,
      }}
    />
  );
}

// ── Team logo (small, inline) ──────────────────────────────────

function TeamLogo({ logo, shortName, size }: { logo: string; shortName: string; size: number }) {
  const url   = getTeamLogo(logo, shortName);
  const color = getTeamColor(shortName);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color + '18',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.32, fontWeight: '700' }}>
        {(shortName || '?').slice(0, 2)}
      </Text>
    </View>
  );
}

// ── Horizontal team row (Cricbuzz-style) ──────────────────────

function HorizontalTeamRow({
  logo, shortName, score, overs, isWinner, isUpcoming,
}: {
  logo: string; shortName: string; score: string;
  overs: string; isWinner: boolean; isUpcoming: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9 }}>
      <TeamLogo logo={logo} shortName={shortName} size={28} />

      <Text
        style={{
          flex: 1,
          marginLeft: 10,
          color:      isWinner ? colors.textPrimary : colors.textSecondary,
          fontSize:   font.base,
          fontWeight: isWinner ? '700' : '500',
        }}
        numberOfLines={1}
      >
        {shortName}
      </Text>

      {!isUpcoming && score ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <Text
            style={{
              color:      isWinner ? colors.textPrimary : colors.textSecondary,
              fontSize:   font.base,
              fontWeight: isWinner ? '700' : '400',
            }}
          >
            {score}
          </Text>
          {overs ? (
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
              ({overs})
            </Text>
          ) : null}
        </View>
      ) : null}

      {!isUpcoming && !score ? (
        <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Yet to bat</Text>
      ) : null}
    </View>
  );
}

// ── Prediction result badge ────────────────────────────────────

export function PredictionBadge({ label, result }: { label: string; result: 'correct' | 'wrong' }) {
  const ok     = result === 'correct';
  const color  = ok ? colors.success : colors.danger;
  const bg     = ok ? colors.successDim : colors.dangerDim;
  const icon   = ok ? 'checkmark-circle-outline' : 'close-circle-outline';
  const suffix = ok ? 'Correct' : 'Wrong';

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: bg, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: color + '30',
      }}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text style={{ color, fontSize: font.xs, fontWeight: '700' }}>
        {label} · {suffix}
      </Text>
    </View>
  );
}

// ── Press animation hook ───────────────────────────────────────

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, {
      toValue: 0.984, useNativeDriver: true, speed: 50, bounciness: 3,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true, speed: 50, bounciness: 3,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
}

// ── MatchCard (primary compact card) ─────────────────────────

export const MatchCard = memo(function MatchCard({
  match,
  onPress,
  predictionResult,
  expertPredictionResult,
}: {
  match:                   AdaptedMatch;
  onPress?:                (id: string) => void;
  predictionResult?:       'correct' | 'wrong' | null;
  expertPredictionResult?: 'correct' | 'wrong' | null;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const router = useRouter();
  const { league } = useLeague();

  const statusLower = match.statusText.toLowerCase();
  const team1Wins   = match.isCompleted && (
    match.winner
      ? match.winner === match.team1Name
      : statusLower.includes(match.team1Short.toLowerCase()) && statusLower.includes('won')
  );
  const team2Wins   = match.isCompleted && (
    match.winner
      ? match.winner === match.team2Name
      : statusLower.includes(match.team2Short.toLowerCase()) && statusLower.includes('won')
  );

  const stageLabel = match.matchStage !== 'LEAGUE' ? ` · ${match.matchStage}` : '';
  const headerLabel = `${league.short} · ${(match.matchType || 'T20').toUpperCase()}${stageLabel}`;
  const resultText  = match.result ?? (match.isLive ? match.statusText : null);
  const countdown   = match.isUpcoming ? getMatchCountdown(match.date) : '';

  return (
    <Pressable
      onPress={() => onPress?.(match.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={{
          transform:    [{ scale }],
          marginBottom: spacing.sm,
          shadowColor:  '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius:  3,
          elevation:    1,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius:    radius.md,
            borderWidth:     1,
            borderColor:     match.isLive ? '#FECACA' : colors.border,
            overflow:        'hidden',
          }}
        >
          {/* Live accent bar at top */}
          {match.isLive && (
            <View style={{ height: 2, backgroundColor: colors.live }} />
          )}

          {/* ── Header row ─────────────────────────────────── */}
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              paddingHorizontal: spacing.lg,
              paddingTop:     spacing.md,
              paddingBottom:  spacing.sm,
            }}
          >
            <Text
              style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '500' }}
              numberOfLines={1}
            >
              {headerLabel}
            </Text>

            {match.isLive && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <LiveDot />
                <Text style={{ color: colors.live, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
                  LIVE
                </Text>
              </View>
            )}

            {match.isUpcoming && (
              <Text style={{ color: colors.warning, fontSize: font.sm, fontWeight: '600' }}>
                {match.time}
                {countdown ? `  ·  ${countdown}` : ''}
              </Text>
            )}

            {match.isCompleted && (
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>
                FT
              </Text>
            )}
          </View>

          {/* ── Divider ────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

          {/* ── Team rows ──────────────────────────────────── */}
          <View style={{ paddingHorizontal: spacing.lg }}>
            <HorizontalTeamRow
              logo={match.team1Logo} shortName={match.team1Short}
              score={match.score1}   overs={match.overs1}
              isWinner={team1Wins}   isUpcoming={match.isUpcoming}
            />
            <View style={{ height: 1, backgroundColor: colors.borderLight }} />
            <HorizontalTeamRow
              logo={match.team2Logo} shortName={match.team2Short}
              score={match.score2}   overs={match.overs2}
              isWinner={team2Wins}   isUpcoming={match.isUpcoming}
            />
          </View>

          {/* ── Footer ─────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm + 1,
              gap:            spacing.md,
            }}
          >
            {(match as any).isAbandoned ? (
              <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>
                No Result
              </Text>
            ) : resultText ? (
              <Text
                style={{ flex: 1, color: match.isLive ? colors.live : colors.textSecondary, fontSize: font.xs }}
                numberOfLines={1}
              >
                {(() => {
                  const txt = resultText;
                  if (match.isCompleted && /^match starts at/i.test(txt)) return 'Result unavailable';
                  return txt;
                })()}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {match.venue ? (
              <Pressable
                onPress={() => (match as any).venueId && router.push(`/(venue)/${(match as any).venueId}` as any)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 1 }}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Ionicons name="location-outline" size={10} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
                  {match.venue}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* ── Prediction badges ──────────────────────────── */}
          {match.isCompleted && (predictionResult != null || expertPredictionResult != null) && (
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

// ── FeaturedMatchCard (hero card — home screen top) ───────────

export const FeaturedMatchCard = memo(function FeaturedMatchCard({
  match,
  onPress,
}: {
  match:    AdaptedMatch;
  onPress?: (id: string) => void;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const team1Color = getTeamColor(match.team1Short);
  const team2Color = getTeamColor(match.team2Short);
  const countdown  = match.isUpcoming ? getMatchCountdown(match.date) : '';

  const statusLower = match.statusText.toLowerCase();
  const team1Wins   = match.isCompleted &&
    statusLower.includes(match.team1Short.toLowerCase()) &&
    statusLower.includes('won');
  const team2Wins   = match.isCompleted &&
    statusLower.includes(match.team2Short.toLowerCase()) &&
    statusLower.includes('won');

  const logo1 = getTeamLogo(match.team1Logo, match.team1Short);
  const logo2 = getTeamLogo(match.team2Logo, match.team2Short);

  return (
    <Pressable
      onPress={() => onPress?.(match.id)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View
        style={{
          transform:     [{ scale }],
          marginBottom:  spacing.lg,
          shadowColor:   '#000',
          shadowOffset:  { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius:  8,
          elevation:     3,
        }}
      >
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius:    radius.xl,
            borderWidth:     1,
            borderColor:     match.isLive ? '#FECACA' : colors.border,
            overflow:        'hidden',
          }}
        >
          {/* Status bar at very top */}
          <View
            style={{
              height:          3,
              backgroundColor: match.isLive ? colors.live : match.isUpcoming ? colors.warning : colors.accent,
            }}
          />

          <View style={{ padding: spacing.xxl, paddingBottom: spacing.lg }}>
            {/* Header */}
            <View
              style={{
                flexDirection:  'row',
                alignItems:     'center',
                justifyContent: 'space-between',
                marginBottom:   spacing.xl,
              }}
            >
              <View>
                {match.matchStage !== 'LEAGUE' && (
                  <View
                    style={{
                      backgroundColor: colors.accentDim,
                      borderRadius:    4,
                      paddingHorizontal: 8,
                      paddingVertical:   3,
                      alignSelf:       'flex-start',
                      marginBottom:    6,
                    }}
                  >
                    <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
                      {match.matchStage}
                    </Text>
                  </View>
                )}
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  {formatMatchDate(match.date)}
                </Text>
              </View>

              {match.isLive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <LiveDot size={7} />
                  <Text style={{ color: colors.live, fontSize: font.sm, fontWeight: '700', letterSpacing: 0.5 }}>
                    LIVE
                  </Text>
                </View>
              ) : match.isUpcoming ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: colors.warning, fontSize: font.base, fontWeight: '700' }}>
                    {match.time}
                  </Text>
                  {countdown ? (
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>
                      {countdown}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>
                  FT
                </Text>
              )}
            </View>

            {/* Teams face-off */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Team 1 */}
              <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
                {logo1 ? (
                  <Image source={{ uri: logo1 }} style={{ width: 56, height: 56 }} resizeMode="contain" />
                ) : (
                  <View
                    style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: team1Color + '18',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: team1Color, fontSize: 16, fontWeight: '800' }}>
                      {match.team1Short}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color:      team1Wins ? colors.textPrimary : colors.textSecondary,
                    fontSize:   font.base,
                    fontWeight: team1Wins ? '800' : '600',
                    textAlign:  'center',
                  }}
                >
                  {match.team1Short}
                </Text>
                {match.score1 ? (
                  <Text
                    style={{
                      color:      team1Wins ? colors.textPrimary : colors.textSecondary,
                      fontSize:   font.lg,
                      fontWeight: team1Wins ? '800' : '600',
                    }}
                  >
                    {match.score1}
                    {match.overs1 ? (
                      <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '400' }}>
                        {' '}({match.overs1})
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>

              {/* VS separator */}
              <View style={{ paddingHorizontal: spacing.lg, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: font.sm, fontWeight: '700', letterSpacing: 1 }}>
                  vs
                </Text>
              </View>

              {/* Team 2 */}
              <View style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
                {logo2 ? (
                  <Image source={{ uri: logo2 }} style={{ width: 56, height: 56 }} resizeMode="contain" />
                ) : (
                  <View
                    style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: team2Color + '18',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: team2Color, fontSize: 16, fontWeight: '800' }}>
                      {match.team2Short}
                    </Text>
                  </View>
                )}
                <Text
                  style={{
                    color:      team2Wins ? colors.textPrimary : colors.textSecondary,
                    fontSize:   font.base,
                    fontWeight: team2Wins ? '800' : '600',
                    textAlign:  'center',
                  }}
                >
                  {match.team2Short}
                </Text>
                {match.score2 ? (
                  <Text
                    style={{
                      color:      team2Wins ? colors.textPrimary : colors.textSecondary,
                      fontSize:   font.lg,
                      fontWeight: team2Wins ? '800' : '600',
                    }}
                  >
                    {match.score2}
                    {match.overs2 ? (
                      <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '400' }}>
                        {' '}({match.overs2})
                      </Text>
                    ) : null}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Result / status line */}
            {(match.result || (match.isLive && match.statusText)) ? (
              <View
                style={{
                  marginTop:      spacing.lg,
                  paddingTop:     spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  alignItems:     'center',
                }}
              >
                <Text
                  style={{
                    color:      match.isLive ? colors.live : colors.textSecondary,
                    fontSize:   font.sm,
                    fontWeight: '500',
                    textAlign:  'center',
                  }}
                  numberOfLines={2}
                >
                  {match.result ?? match.statusText}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Venue footer */}
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            4,
              paddingBottom:  spacing.lg,
            }}
          >
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
              {match.venue}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
