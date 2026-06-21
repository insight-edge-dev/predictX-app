import { Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLeague, useIsFootball } from '@/contexts/LeagueContext';

export default function TabLayout() {
  const insets     = useSafeAreaInsets();
  const isFootball = useIsFootball();
  const { league, hasSelectedLeague } = useLeague();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor:   isFootball ? '#16A34A' : '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize:      10,
          fontWeight:    '600',
          marginTop:     2,
          letterSpacing: 0,
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth:  1,
          borderTopColor:  '#E5E7EB',
          height:          52 + insets.bottom,
          paddingBottom:   insets.bottom || 6,
          paddingTop:      6,
          elevation:       0,
          shadowOpacity:   0,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(leaguehome)"
        options={{
          tabBarLabel: league.short,
          href: hasSelectedLeague ? undefined : null,
          tabBarIcon: ({ size }) => (
            <Text style={{ fontSize: size }}>{league.flag}</Text>
          ),
        }}
      />

      <Tabs.Screen
        name="(matches)"
        options={{
          tabBarLabel: isFootball ? 'Fixtures' : 'Matches',
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isFootball ? 'football-outline' : 'calendar-outline'}
              size={size - 2}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="(news)"
        options={{ href: null }}
      />

      <Tabs.Screen
        name="(tips)"
        options={{
          tabBarLabel: 'PredictX',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="flash-outline" size={size - 2} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(profile)"
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size - 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
