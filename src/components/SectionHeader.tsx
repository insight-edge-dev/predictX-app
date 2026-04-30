import { View, Text } from "react-native";

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "700" }}>
        {title}
      </Text>
    </View>
  );
}
