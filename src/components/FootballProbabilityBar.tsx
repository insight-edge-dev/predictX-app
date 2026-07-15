import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { springs } from '@/utils/anim';
import { colors, spacing, font, radius } from '@/constants/theme';

interface FootballProbabilityBarProps {
  homeTeam:    string;
  awayTeam:    string;
  homeWin:     number;
  draw:        number;
  awayWin:     number;
  isKnockout?: boolean;
  flat?:       boolean; // skip outer card wrapper (use when already inside a card)
}

export function FootballProbabilityBar({
  homeTeam,
  awayTeam,
  homeWin,
  draw,
  awayWin,
  isKnockout = false,
  flat       = false,
}: FootballProbabilityBarProps) {
  const total = homeWin + draw + awayWin || 100;

  const homeAnim = useSharedValue(0);
  const drawAnim = useSharedValue(0);
  const awayAnim = useSharedValue(0);

  useEffect(() => {
    homeAnim.value = withSpring(homeWin / total, springs.smooth);
    drawAnim.value = withSpring(draw   / total, springs.smooth);
    awayAnim.value = withSpring(awayWin / total, springs.smooth);
  }, [homeWin, draw, awayWin, total]);

  const homeStyle = useAnimatedStyle(() => ({ flex: homeAnim.value }));
  const drawStyle = useAnimatedStyle(() => ({ flex: drawAnim.value }));
  const awayStyle = useAnimatedStyle(() => ({ flex: awayAnim.value }));

  const max = Math.max(homeWin, awayWin, draw || 0);
  const homeLeads = homeWin === max && homeWin > awayWin;
  const awayLeads = awayWin === max && awayWin > homeWin;

  const inner = (
    <View>
      {/* Percentage + team labels */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md }}>
        {/* Home */}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Text style={{
            fontSize:    homeLeads ? 26 : 20,
            fontWeight:  '900',
            color:       homeLeads ? colors.success : colors.textSecondary,
            letterSpacing: -0.5,
            lineHeight:  homeLeads ? 30 : 24,
          }}>
            {homeWin}%
          </Text>
          <Text style={{ fontSize: font.xs, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}
            numberOfLines={1}>
            {homeTeam}
          </Text>
        </View>

        {/* Draw (only for non-knockout) */}
        {!isKnockout && draw > 0 && (
          <View style={{ alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: 2 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.textSecondary }}>{draw}%</Text>
            <Text style={{ fontSize: font.xs, color: colors.textMuted, marginTop: 2 }}>Draw</Text>
          </View>
        )}

        {/* Away */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{
            fontSize:    awayLeads ? 26 : 20,
            fontWeight:  '900',
            color:       awayLeads ? colors.danger : colors.textSecondary,
            letterSpacing: -0.5,
            lineHeight:  awayLeads ? 30 : 24,
          }}>
            {awayWin}%
          </Text>
          <Text style={{ fontSize: font.xs, color: colors.textMuted, fontWeight: '600', marginTop: 2 }}
            numberOfLines={1}>
            {awayTeam}
          </Text>
        </View>
      </View>

      {/* Animated bar */}
      <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 2 }}>
        <Animated.View style={[{ backgroundColor: colors.success, borderRadius: 5 }, homeStyle]} />
        {!isKnockout && draw > 0 && (
          <Animated.View style={[{ backgroundColor: '#D1D5DB', borderRadius: 5 }, drawStyle]} />
        )}
        <Animated.View style={[{ backgroundColor: colors.danger, borderRadius: 5 }, awayStyle]} />
      </View>

      {isKnockout && (
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center' }}>
          Knockout · no draw
        </Text>
      )}
    </View>
  );

  if (flat) return inner;

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius:    radius.md,
      padding:         spacing.lg,
      borderWidth:     1,
      borderColor:     colors.border,
    }}>
      {inner}
    </View>
  );
}
