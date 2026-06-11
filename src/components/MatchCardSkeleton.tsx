import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { colors, spacing, radius } from "@/constants/theme";

function Bone({ width, height, r = 6 }: { width: number | string; height: number; r?: number }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: r,
        backgroundColor: colors.borderLight,
        opacity,
      }}
    />
  );
}

// Compact Cricbuzz-style skeleton
export function MatchCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    radius.md,
        borderWidth:     1,
        borderColor:     colors.border,
        marginBottom:    spacing.sm,
        overflow:        'hidden',
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 1 },
        shadowOpacity:   0.04,
        shadowRadius:    3,
        elevation:       1,
      }}
    >
      {/* Header row */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
        }}
      >
        <Bone width={110} height={11} />
        <Bone width={36}  height={11} r={4} />
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

      {/* Team row 1 */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.lg, paddingVertical: 9, gap: 10,
        }}
      >
        <Bone width={28} height={28} r={14} />
        <Bone width={60} height={13} />
        <View style={{ flex: 1 }} />
        <Bone width={80} height={13} />
      </View>

      {/* Inner divider */}
      <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />

      {/* Team row 2 */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.lg, paddingVertical: 9, gap: 10,
        }}
      >
        <Bone width={28} height={28} r={14} />
        <Bone width={48} height={13} />
        <View style={{ flex: 1 }} />
        <Bone width={64} height={13} />
      </View>

      {/* Footer */}
      <View style={{ height: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.lg }} />
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 1,
        }}
      >
        <Bone width={140} height={11} />
        <Bone width={90}  height={11} />
      </View>
    </View>
  );
}
