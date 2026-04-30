import { View, Text } from "react-native";

interface TeamRowProps {
  teamName: string;
  shortName: string;
  score?: string;
}

export function TeamRow({ teamName, shortName, score }: TeamRowProps) {
  return (
    <View className="flex-row items-center justify-between py-[8px]">
      <View className="flex-row items-center">
        <View className="w-[32px] h-[32px] rounded-full bg-card mr-[12px]" />
        <View>
          <Text className="text-white text-[16px] font-bold">
            {shortName}
          </Text>
          <Text className="text-secondary text-[12px]">
            {teamName}
          </Text>
        </View>
      </View>
      {score ? (
        <Text className="text-white text-[20px] font-bold">
          {score}
        </Text>
      ) : null}
    </View>
  );
}
