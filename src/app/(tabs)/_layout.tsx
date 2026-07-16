import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useIsFootball } from '@/contexts/LeagueContext';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import api from '@/services/api';
import { usePushNotifications, requestPushPermissionAndRegister, getPermissionStatus } from '@/hooks/usePushNotifications';

const BAR_H = 60;

const META = {
  '(home)':        { on: 'home',     off: 'home-outline',     label: 'Home'     },
  '(matches)':     { on: 'calendar', off: 'calendar-outline', label: 'Matches',
                     fbOn: 'football', fbOff: 'football-outline', fbLabel: 'Fixtures' },
  '(leaderboard)': { on: 'trophy',   off: 'trophy-outline',   label: 'Ranks'    },
  '(tips)':        { on: 'flash',    off: 'flash-outline',    label: 'PredictX' },
  '(profile)':     { on: 'person',   off: 'person-outline',   label: 'Profile'  },
} as const;

const VISIBLE = new Set(['(home)', '(matches)', '(leaderboard)', '(tips)', '(profile)']);

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets     = useSafeAreaInsets();
  const isFootball = useIsFootball();
  const accent     = isFootball ? '#16A34A' : '#2563EB';
  const inactive   = '#9CA3AF';

  const visibleRoutes = state.routes.filter(r => VISIBLE.has(r.name));

  return (
    <View style={[s.bar, { paddingBottom: insets.bottom }]}>
      {visibleRoutes.map(route => {
        const name    = route.name;
        const isLb    = name === '(leaderboard)';
        const realIdx = state.routes.indexOf(route);
        const focused = state.index === realIdx;
        const meta    = META[name as keyof typeof META];

        const isMatches = name === '(matches)';
        const icon  = isMatches && isFootball
          ? (focused ? meta.fbOn! : meta.fbOff!)
          : (focused ? meta.on    : meta.off);
        const label = isMatches && isFootball ? meta.fbLabel! : meta.label;
        const color = focused ? accent : inactive;

        return (
          <Pressable
            key={route.key}
            style={s.tabBtn}
            hitSlop={8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !ev.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Ionicons name={icon as any} size={24} color={color} />
            <Text style={[s.label, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: '#FFFFFF',
    borderTopWidth:  1,
    borderTopColor:  '#E5E7EB',
    minHeight:       BAR_H,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 8 },
    }),
  },
  tabBtn: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingTop:     8,
    gap:            3,
    position:       'relative',
  },
label: {
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 0.1,
  },
});

const NOTIF_PROMPT_KEY = 'notif_prompt_shown_v1';

function useFirstLaunchNotifPermission() {
  useEffect(() => {
    if (Constants.appOwnership === 'expo') return; // Expo Go doesn't support push

    SecureStore.getItemAsync(NOTIF_PROMPT_KEY).then(val => {
      if (val) return; // already asked before
      SecureStore.setItemAsync(NOTIF_PROMPT_KEY, '1').catch(() => {});
      getPermissionStatus().then(status => {
        if (status === 'granted') return; // already have permission
        // Small delay so the home screen renders first, then show native system dialog
        setTimeout(() => requestPushPermissionAndRegister(), 800);
      });
    }).catch(() => {});
  }, []);
}

function usePrefetch() {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ['tips:bundle'],
      queryFn:  () => api.get('/tips/bundle'),
      staleTime: 2 * 60_000,
    });
  }, [queryClient]);
}

export default function TabLayout() {
  usePrefetch();
  usePushNotifications();
  useFirstLaunchNotifPermission();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="(home)"        options={{ title: 'Home'        }} />
      <Tabs.Screen name="(matches)"     options={{ title: 'Matches'     }} />
      <Tabs.Screen name="(leaderboard)" options={{ title: 'Leaderboard' }} />
      <Tabs.Screen name="(news)"        options={{ href: null           }} />
      <Tabs.Screen name="(tips)"        options={{ title: 'PredictX'   }} />
      <Tabs.Screen name="(profile)"     options={{ title: 'Profile'    }} />
    </Tabs>
  );
}
