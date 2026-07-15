import { useEffect } from "react";
import { View, Text } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { springs } from "@/utils/anim";
import { colors, font } from "@/constants/theme";

interface ProbabilityBarProps {
  team1Name: string;
  team2Name: string;
  team1Probability: number;
  team2Probability: number;
}

export function ProbabilityBar({
  team1Name,
  team2Name,
  team1Probability,
  team2Probability,
}: ProbabilityBarProps) {
  const bar1Flex = useSharedValue(0);
  const bar2Flex = useSharedValue(0);

  useEffect(() => {
    bar1Flex.value = withSpring(team1Probability, springs.smooth);
    bar2Flex.value = withSpring(team2Probability, springs.smooth);
  }, [team1Probability, team2Probability]);

  const bar1Style = useAnimatedStyle(() => ({ flex: bar1Flex.value }));
  const bar2Style = useAnimatedStyle(() => ({ flex: bar2Flex.value }));

  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16 }}>
      {/* Labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
          {team1Name} {team1Probability}%
        </Text>
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
          {team2Name} {team2Probability}%
        </Text>
      </View>

      {/* Animated bar */}
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 999, overflow: 'hidden' }}>
        <Animated.View style={[{ backgroundColor: colors.success, borderRadius: 999 }, bar1Style]} />
        <Animated.View style={[{ backgroundColor: colors.danger,  borderRadius: 999 }, bar2Style]} />
      </View>
    </View>
  );
}
