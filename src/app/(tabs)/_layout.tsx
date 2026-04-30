import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          marginTop:  2,
        },
        tabBarStyle: {
          backgroundColor: '#0A0F1C',
          borderTopWidth:  0.5,
          borderTopColor:  colors.border,
          height:          72,
          paddingBottom:   12,
          paddingTop:      8,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(matches)"
        options={{
          tabBarLabel: 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size - 2} color={color} />
          ),
        }}
      />

      {/* News tab hidden — removed from product */}
      <Tabs.Screen
        name="(news)"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(tips)"
        options={{
          tabBarLabel: 'Predict',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(profile)"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
