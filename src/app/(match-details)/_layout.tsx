import { Stack } from "expo-router";

export default function MatchDetailsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#07080F" },
      }}
    />
  );
}
