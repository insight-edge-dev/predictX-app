/**
 * MatchCard.tsx — production match card for the IPL IQ app.
 *
 * Accepts AdaptedMatch (from matchAdapter.ts) — all fields null-safe.
 *
 * Status color system:
 *   LIVE      → #FF4545  (red)
 *   UPCOMING  → #4F8CFF  (blue / accent)
 *   COMPLETED → #8899AA  (muted gray)
 *
 * Exported components:
 *   MatchCard         — standard vertical card
 *   FeaturedMatchCard — larger hero card (for top of list)
 */

import {
  View,
  Text,
  Pressable,
  Image,
  Animated,
} from 'react-native';
import { memo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { AdaptedMatch } from '@/utils/matchAdapter';
import { getTeamLogo, getTeamColor } from '@/theme/colors';
import { formatMatchDate, getMatchCountdown } from '@/utils/date';
import { colors, spacing, font, radius } from '@/constants/theme';

// ── Status config ─────────────────────────────────────────────

function getStatusConfig(status: AdaptedMatch['status']) {
  switch (status) {
    case 'live':
      return {
        color:   colors.live,
        bg:      colors.live     + '20',
        border:  colors.live     + '50',
        label:   '● LIVE',
      };
    case 'upcoming':
      return {
        color:   colors.accent,
        bg:      colors.accent   + '18',
        border:  colors.accent   + '40',
        label:   'UPCOMING',
      };
    case 'completed':
    default:
      return {
        color:   colors.textSecondary,
        bg:      colors.textSecondary + '18',
        border:  colors.textSecondary + '30',
        label:   'COMPLETED',
      };
  }
}

// ── Stage badge config ────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  QUALIFIER:  '#A78BFA',
  ELIMINATOR: '#FB923C',
  FINAL:      colors.accent,
};

// ── TeamLogo ──────────────────────────────────────────────────

function TeamLogo({
  logo,
  shortName,
  size,
}: {
  logo:      string;
  shortName: string;
  size:      number;
}) {
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
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: color + '20',
        alignItems:      'center',
        justifyContent:  'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.3, fontWeight: '700' }}>
        {shortName || '?'}
      </Text>
    </View>
  );
}

// ── StatusBadge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: AdaptedMatch['status'] }) {
  const cfg = getStatusConfig(status);
  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderRadius:    8,
        paddingHorizontal: spacing.sm,
        paddingVertical:   3,
        borderWidth:     1,
        borderColor:     cfg.border,
      }}
    >
      <Text
        style={{
          color:       cfg.color,
          fontSize:    font.xs,
          fontWeight:  '700',
          letterSpacing: 0.6,
        }}
      >
        {cfg.label}
      </Text>
    </View>
  );
}

// ── StageBadge ────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string }) {
  const color = STAGE_COLORS[stage];
  if (!color) return null;
  return (
    <View
      style={{
        backgroundColor: color + '20',
        borderRadius:    6,
        paddingHorizontal: spacing.sm,
        paddingVertical:   2,
        borderWidth:     1,
        borderColor:     color + '50',
        alignSelf:       'flex-start',
        marginBottom:    spacing.xs,
      }}
    >
      <Text style={{ color, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
        ★ {stage}
      </Text>
    </View>
  );
}

// ── TeamColumn ────────────────────────────────────────────────

function TeamColumn({
  logo,
  shortName,
  score,
  overs,
  isWinner,
  align,
}: {
  logo:      string;
  shortName: string;
  score:     string;
  overs:     string;
  isWinner:  boolean;
  align:     'left' | 'right';
}) {
  const color = getTeamColor(shortName);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      {/* Winner highlight ring */}
      <View
        style={{
          padding:        isWinner ? 3 : 0,
          borderRadius:   36,
          borderWidth:    isWinner ? 2 : 0,
          borderColor:    isWinner ? color + '80' : 'transparent',
        }}
      >
        <TeamLogo logo={logo} shortName={shortName} size={52} />
      </View>

      <Text
        style={{
          color:       isWinner ? '#FFFFFF' : colors.textSecondary,
          fontSize:    font.base,
          fontWeight:  isWinner ? '800' : '600',
          marginTop:   spacing.sm,
          textAlign:   'center',
        }}
      >
        {shortName}
      </Text>

      {score ? (
        <Text
          style={{
            color:      isWinner ? '#FFFFFF' : colors.textSecondary,
            fontSize:   font.md,
            fontWeight: isWinner ? '700' : '500',
            marginTop:  2,
          }}
        >
          {score}
        </Text>
      ) : null}

      {overs ? (
        <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>
          ({overs} ov)
        </Text>
      ) : null}
    </View>
  );
}

// ── MatchCard ─────────────────────────────────────────────────

export const MatchCard = memo(function MatchCard({
  match,
  onPress,
}: {
  match:   AdaptedMatch;
  onPress?: (id: string) => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const team1Color  = getTeamColor(match.team1Short);
  const team2Color  = getTeamColor(match.team2Short);
  const statusCfg   = getStatusConfig(match.status);
  const countdown   = match.isUpcoming ? getMatchCountdown(match.date) : '';

  // Determine winner for highlight
  const statusLower = match.statusText.toLowerCase();
  const team1Wins   =
    match.isCompleted &&
    statusLower.includes(match.team1Short.toLowerCase()) &&
    statusLower.includes('won');
  const team2Wins   =
    match.isCompleted &&
    statusLower.includes(match.team2Short.toLowerCase()) &&
    statusLower.includes('won');

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, {
      toValue:         0.97,
      useNativeDriver: true,
      speed:           50,
      bounciness:      4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue:         1,
      useNativeDriver: true,
      speed:           50,
      bounciness:      4,
    }).start();
  };

  return (
    <Pressable
      onPress={() => onPress?.(match.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform:     [{ scale: scaleAnim }],
          marginBottom:  spacing.md,
          shadowColor:   match.isLive ? colors.live : team1Color,
          shadowOffset:  { width: 0, height: 4 },
          shadowOpacity: match.isLive ? 0.25 : 0.12,
          shadowRadius:  12,
          elevation:     6,
        }}
      >
        {/* Stage badge above card */}
        {match.matchStage !== 'LEAGUE' && (
          <StageBadge stage={match.matchStage} />
        )}

        {/* Dual-color top bar */}
        <View
          style={{
            flexDirection:       'row',
            borderTopLeftRadius:  radius.md,
            borderTopRightRadius: radius.md,
            overflow:             'hidden',
          }}
        >
          <View style={{ flex: 1, height: 3, backgroundColor: team1Color }} />
          <View style={{ flex: 1, height: 3, backgroundColor: team2Color }} />
        </View>

        <LinearGradient
          colors={['#0D1421', '#0A1118', '#0D1421']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderBottomLeftRadius:  radius.md,
            borderBottomRightRadius: radius.md,
            padding:    spacing.lg,
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: match.isLive
              ? colors.live + '30'
              : colors.border,
          }}
        >
          {/* Top row: series info + status badge */}
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              justifyContent: 'space-between',
              marginBottom:   spacing.lg,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm }}>
              <View
                style={{
                  backgroundColor: colors.accentDim,
                  borderRadius:    6,
                  paddingHorizontal: spacing.sm,
                  paddingVertical:   3,
                  marginRight:     spacing.sm,
                }}
              >
                <Text
                  style={{
                    color:        colors.accent,
                    fontSize:     font.xs,
                    fontWeight:   '700',
                    letterSpacing: 0.8,
                  }}
                >
                  IPL • T20
                </Text>
              </View>
              <Text
                style={{
                  color:    colors.textSecondary,
                  fontSize: font.xs,
                }}
                numberOfLines={1}
              >
                {formatMatchDate(match.date)}
              </Text>
            </View>
            <StatusBadge status={match.status} />
          </View>

          {/* Teams */}
          <View
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <TeamColumn
              logo={match.team1Logo}
              shortName={match.team1Short}
              score={match.score1}
              overs={match.overs1}
              isWinner={team1Wins}
              align="left"
            />

            {/* Center separator */}
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, minWidth: 56 }}>
              {match.isUpcoming ? (
                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      color:      statusCfg.color,
                      fontSize:   font.lg,
                      fontWeight: '800',
                    }}
                  >
                    {match.time}
                  </Text>
                  {countdown ? (
                    <View
                      style={{
                        flexDirection:  'row',
                        alignItems:     'center',
                        marginTop:      spacing.xs,
                      }}
                    >
                      <Ionicons
                        name="time-outline"
                        size={10}
                        color={colors.textMuted}
                      />
                      <Text
                        style={{
                          color:      colors.textMuted,
                          fontSize:   font.xs,
                          fontWeight: '600',
                          marginLeft: 3,
                        }}
                      >
                        {countdown}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text
                  style={{
                    color:      colors.textMuted + '80',
                    fontSize:   font.lg,
                    fontWeight: '800',
                  }}
                >
                  VS
                </Text>
              )}
            </View>

            <TeamColumn
              logo={match.team2Logo}
              shortName={match.team2Short}
              score={match.score2}
              overs={match.overs2}
              isWinner={team2Wins}
              align="right"
            />
          </View>

          {/* Result / live status line */}
          {(match.result || (match.isLive && match.statusText)) ? (
            <View
              style={{
                marginTop:       spacing.md,
                paddingTop:      spacing.md,
                borderTopWidth:  1,
                borderTopColor:  colors.border,
                alignItems:      'center',
              }}
            >
              <Text
                style={{
                  color:      match.isLive ? colors.live : colors.textSecondary,
                  fontSize:   font.sm,
                  fontWeight: match.isCompleted ? '600' : '500',
                  textAlign:  'center',
                }}
                numberOfLines={2}
              >
                {match.result ?? match.statusText}
              </Text>
            </View>
          ) : null}

          {/* Venue + time */}
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              justifyContent: 'center',
              marginTop:      spacing.sm,
            }}
          >
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text
              style={{
                color:     colors.textMuted,
                fontSize:  font.xs,
                marginLeft: 3,
              }}
              numberOfLines={1}
            >
              {match.venue}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});

// ── FeaturedMatchCard ─────────────────────────────────────────
// Larger hero card shown at the top of the list.

export const FeaturedMatchCard = memo(function FeaturedMatchCard({
  match,
  onPress,
}: {
  match:    AdaptedMatch;
  onPress?: (id: string) => void;
}) {
  const scaleAnim  = useRef(new Animated.Value(1)).current;
  const team1Color = getTeamColor(match.team1Short);
  const team2Color = getTeamColor(match.team2Short);
  const countdown  = match.isUpcoming ? getMatchCountdown(match.date) : '';
  const statusCfg  = getStatusConfig(match.status);

  const statusLower = match.statusText.toLowerCase();
  const team1Wins   =
    match.isCompleted &&
    statusLower.includes(match.team1Short.toLowerCase()) &&
    statusLower.includes('won');
  const team2Wins   =
    match.isCompleted &&
    statusLower.includes(match.team2Short.toLowerCase()) &&
    statusLower.includes('won');

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.spring(scaleAnim, {
      toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={() => onPress?.(match.id)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={{
          transform:     [{ scale: scaleAnim }],
          marginBottom:  spacing.xl,
          shadowColor:   '#000',
          shadowOffset:  { width: 0, height: 8 },
          shadowOpacity: 0.35,
          shadowRadius:  20,
          elevation:     12,
        }}
      >
        {/* FEATURED label */}
        <View style={{ position: 'absolute', top: spacing.md, left: spacing.lg, zIndex: 10 }}>
          <View
            style={{
              backgroundColor: match.isLive ? colors.live : colors.accent,
              borderRadius:    6,
              paddingHorizontal: spacing.sm,
              paddingVertical:   4,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
              {match.isLive ? '● LIVE NOW' : '★ FEATURED'}
            </Text>
          </View>
        </View>

        <LinearGradient
          colors={[
            team1Color + '35',
            '#0D1421',
            '#0A1118',
            '#0D1421',
            team2Color + '35',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius:  radius.xl,
            padding:       spacing.xxl,
            paddingTop:    48,
            minHeight:     220,
            borderWidth:   1,
            borderColor:   match.isLive ? colors.live + '30' : colors.border,
          }}
        >
          {/* Stage badge */}
          {match.matchStage !== 'LEAGUE' && (
            <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
              <StageBadge stage={match.matchStage} />
            </View>
          )}

          {/* Date row */}
          <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
            <Text style={{ color: colors.textSecondary, fontSize: font.xs }}>
              {formatMatchDate(match.date)}
            </Text>
          </View>

          {/* Teams face-off */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  padding:     team1Wins ? 4 : 0,
                  borderRadius: 40,
                  borderWidth:  team1Wins ? 2 : 0,
                  borderColor:  team1Wins ? team1Color + '80' : 'transparent',
                }}
              >
                <TeamLogo logo={match.team1Logo} shortName={match.team1Short} size={68} />
              </View>
              <Text
                style={{
                  color:      team1Wins ? '#FFF' : colors.textSecondary,
                  fontSize:   font.xl,
                  fontWeight: team1Wins ? '800' : '600',
                  marginTop:  spacing.sm,
                }}
              >
                {match.team1Short}
              </Text>
              {match.score1 ? (
                <Text style={{ color: '#FFF', fontSize: font.base, fontWeight: '700', marginTop: 2 }}>
                  {match.score1}
                </Text>
              ) : null}
              {match.overs1 ? (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  ({match.overs1} ov)
                </Text>
              ) : null}
            </View>

            {/* Center */}
            <View style={{ alignItems: 'center', paddingHorizontal: spacing.md }}>
              <Text
                style={{
                  color:      colors.textMuted + '60',
                  fontSize:   22,
                  fontWeight: '900',
                }}
              >
                VS
              </Text>
              {match.isUpcoming && (
                <View style={{ alignItems: 'center', marginTop: spacing.sm }}>
                  <Text
                    style={{
                      color:      statusCfg.color,
                      fontSize:   font.xl,
                      fontWeight: '800',
                    }}
                  >
                    {match.time}
                  </Text>
                  {countdown ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}>
                      <Ionicons name="time-outline" size={10} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontSize: font.xs, marginLeft: 3 }}>
                        {countdown}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>

            <View style={{ flex: 1, alignItems: 'center' }}>
              <View
                style={{
                  padding:     team2Wins ? 4 : 0,
                  borderRadius: 40,
                  borderWidth:  team2Wins ? 2 : 0,
                  borderColor:  team2Wins ? team2Color + '80' : 'transparent',
                }}
              >
                <TeamLogo logo={match.team2Logo} shortName={match.team2Short} size={68} />
              </View>
              <Text
                style={{
                  color:      team2Wins ? '#FFF' : colors.textSecondary,
                  fontSize:   font.xl,
                  fontWeight: team2Wins ? '800' : '600',
                  marginTop:  spacing.sm,
                }}
              >
                {match.team2Short}
              </Text>
              {match.score2 ? (
                <Text style={{ color: '#FFF', fontSize: font.base, fontWeight: '700', marginTop: 2 }}>
                  {match.score2}
                </Text>
              ) : null}
              {match.overs2 ? (
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                  ({match.overs2} ov)
                </Text>
              ) : null}
            </View>
          </View>

          {/* Result / status */}
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
                  fontSize:   font.md,
                  fontWeight: '600',
                  textAlign:  'center',
                }}
                numberOfLines={2}
              >
                {match.result ?? match.statusText}
              </Text>
            </View>
          ) : null}

          {/* Venue */}
          <View
            style={{
              flexDirection:  'row',
              alignItems:     'center',
              justifyContent: 'center',
              marginTop:      spacing.md,
            }}
          >
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text
              style={{ color: colors.textMuted, fontSize: font.xs, marginLeft: 4 }}
              numberOfLines={1}
            >
              {match.venue}
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
});
