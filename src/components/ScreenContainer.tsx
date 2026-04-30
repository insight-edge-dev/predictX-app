import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: React.ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-[16px] pt-[8px]">
        {children}
      </View>
    </SafeAreaView>
  );
}
