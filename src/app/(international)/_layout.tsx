import { Stack } from 'expo-router';

export default function InternationalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8F9FB' } }} />
  );
}
