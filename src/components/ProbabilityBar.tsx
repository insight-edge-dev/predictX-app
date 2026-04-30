import { View, Text } from "react-native";

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
  return (
    <View className="bg-card rounded-[16px] p-[16px]">
      {/* Labels */}
      <View className="flex-row justify-between mb-[8px]">
        <Text className="text-white text-[14px] font-bold">
          {team1Name} {team1Probability}%
        </Text>
        <Text className="text-white text-[14px] font-bold">
          {team2Name} {team2Probability}%
        </Text>
      </View>

      {/* Bar */}
      <View className="flex-row h-[8px] rounded-full overflow-hidden">
        <View
          className="bg-win rounded-l-full"
          style={{ flex: team1Probability }}
        />
        <View
          className="bg-lose rounded-r-full"
          style={{ flex: team2Probability }}
        />
      </View>
    </View>
  );
}
