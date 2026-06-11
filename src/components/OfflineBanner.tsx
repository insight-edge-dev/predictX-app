import { useEffect, useState, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OfflineBanner() {
  const [isOffline, setIsOffline]     = useState(false);
  const [showBack,  setShowBack]      = useState(false);
  const slideY   = useRef(new Animated.Value(-60)).current;
  const insets   = useSafeAreaInsets();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(offline);
      if (!offline) setShowBack(true);
    });
    return () => { unsub(); if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Animate in/out
  useEffect(() => {
    if (isOffline) {
      setShowBack(false);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
    } else if (showBack) {
      // Show "Back online" briefly then slide out
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
      timerRef.current = setTimeout(() => {
        Animated.timing(slideY, { toValue: -60, duration: 300, useNativeDriver: true }).start(() => setShowBack(false));
      }, 2000);
    } else {
      Animated.timing(slideY, { toValue: -60, duration: 250, useNativeDriver: true }).start();
    }
  }, [isOffline, showBack]);

  if (!isOffline && !showBack) return null;

  const isBack = !isOffline && showBack;

  return (
    <Animated.View
      style={{
        position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 9999,
        transform: [{ translateY: slideY }],
      }}
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
