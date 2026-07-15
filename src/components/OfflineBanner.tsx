import { useEffect, useState, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming,
  runOnJS,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springs, timings } from '@/utils/anim';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBack,  setShowBack]  = useState(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets    = useSafeAreaInsets();

  const translateY  = useSharedValue(-60);
  const bannerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      if (!offline) setShowBack(true);
    });
    return () => { unsub(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (isOffline) {
      setShowBack(false);
      translateY.value = withSpring(0, springs.smooth);
    } else if (showBack) {
      translateY.value = withSpring(0, springs.smooth);
      timerRef.current = setTimeout(() => {
        translateY.value = withTiming(-60, timings.fast, (finished) => {
          if (finished) runOnJS(setShowBack)(false);
        });
      }, 2000);
    } else {
      translateY.value = withTiming(-60, timings.fast);
    }
  }, [isOffline, showBack]);

  if (!isOffline && !showBack) return null;

  const isBack = !isOffline && showBack;

  return (
    <Animated.View
      style={[{
        position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 9999,
      }, bannerStyle]}
    >
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 10,
        backgroundColor: isBack ? colors.success : '#1a0a00',
        borderBottomWidth: 1,
        borderBottomColor: isBack ? colors.success + '50' : colors.danger + '50',
      }}>
        <Ionicons
          name={isBack ? 'wifi' : 'wifi-outline'}
          size={14}
          color={isBack ? colors.success : colors.danger}
        />
        <Text style={{
          color: isBack ? colors.success : colors.danger,
          fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5,
        }}>
          {isBack ? 'Back online' : 'No internet connection'}
        </Text>
      </View>
    </Animated.View>
  );
}
