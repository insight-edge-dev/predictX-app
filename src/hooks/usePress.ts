import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { springs } from '@/utils/anim';

/**
 * UI-thread press scale animation. Drop-in replacement for the manual
 * Animated.Value + Animated.spring press pattern used across card components.
 *
 * Returns `style` (Reanimated animated style) + `onPressIn` / `onPressOut`
 * handlers to spread onto a Pressable. Wrapping view must be Animated.View
 * from react-native-reanimated (not react-native).
 *
 * Haptic feedback fires on every press-in.
 *
 * Usage:
 *   const press = usePress(0.984);
 *   <Animated.View style={[styles.card, press.style]}>
 *     <Pressable onPressIn={press.onPressIn} onPressOut={press.onPressOut}>
 */
export function usePress(scaleDown = 0.96) {
  const pressed = useSharedValue(false);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? scaleDown : 1, springs.snappy) }],
  }));

  return {
    style,
    onPressIn:  () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      pressed.value = true;
    },
    onPressOut: () => { pressed.value = false; },
  };
}
