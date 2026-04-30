import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { colors } from "@/theme/colors";

function Bone({ width, height, radius = 8 }: { width: number; height: number; radius?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.border,
        opacity,
      }}
    />
  );
}

export function MatchCardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {/* Top row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Bone width={36} height={18} radius={6} />
          <View style={{ width: 8 }} />
          <Bone width={70} height={14} />
        </View>
        <Bone width={80} height={22} radius={100} />
      </View>

      {/* Teams row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Bone width={56} height={56} radius={28} />
          <View style={{ height: 8 }} />
          <Bone width={40} height={16} />
        </View>
        <Bone width={28} height={14} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Bone width={56} height={56} radius={28} />
          <View style={{ height: 8 }} />
          <Bone width={40} height={16} />
        </View>
      </View>

      {/* Prediction bar placeholder */}
      <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Bone width={80} height={10} />
        <View style={{ height: 8 }} />
        <Bone width={280} height={6} radius={3} />
      </View>

      {/* Venue */}
      <View style={{ marginTop: 12, alignItems: "center" }}>
        <Bone width={120} height={12} />
      </View>
    </View>
  );
}
