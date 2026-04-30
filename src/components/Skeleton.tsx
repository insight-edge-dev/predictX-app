import { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { colors, radius, spacing } from "@/constants/theme";

// ── Animated shimmer bone ─────────────────────────────────────
export function Bone({
  w, h, br = 8, mb = 0,
}: { w: number | `${number}%`; h: number; br?: number; mb?: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.55, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 750, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return (
    <Animated.View style={{
      width: w, height: h, borderRadius: br,
      backgroundColor: colors.border,
      opacity, marginBottom: mb,
    }} />
  );
}

// ── Prediction card skeleton (tips list) ─────────────────────
export function PredictionCardSkeleton() {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.xl, marginBottom: 16,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden",
    }}>
      {/* accent bar */}
      <View style={{ height: 3, backgroundColor: colors.border }} />
      <View style={{ padding: 18 }}>
        {/* status row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 18 }}>
          <Bone w={80} h={22} br={6} />
          <Bone w={70} h={16} br={6} />
        </View>
        {/* teams row */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 18 }}>
          <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
            <Bone w={56} h={56} br={28} />
            <Bone w={36} h={14} br={6} />
            <Bone w={44} h={26} br={6} />
          </View>
          <View style={{ alignItems: "center", paddingHorizontal: 12, gap: 8 }}>
            <Bone w={1} h={18} br={1} />
            <Bone w={24} h={14} br={4} />
            <Bone w={1} h={18} br={1} />
          </View>
          <View style={{ flex: 1, alignItems: "center", gap: 8 }}>
            <Bone w={56} h={56} br={28} />
            <Bone w={36} h={14} br={6} />
            <Bone w={44} h={26} br={6} />
          </View>
        </View>
        {/* prob bar */}
        <Bone w="100%" h={5} br={3} mb={14} />
        {/* footer row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border + "60" }}>
          <View style={{ gap: 6 }}>
            <Bone w={100} h={12} br={4} />
            <Bone w={80} h={10} br={4} />
          </View>
          <Bone w={80} h={32} br={8} />
        </View>
      </View>
    </View>
  );
}

// ── News card skeleton ────────────────────────────────────────
export function NewsCardSkeleton({ featured }: { featured?: boolean }) {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
      overflow: "hidden",
    }}>
      {featured && <Bone w="100%" h={180} br={0} mb={0} />}
      <View style={{ padding: 14, gap: 8 }}>
        <Bone w={60} h={12} br={4} />
        <Bone w="90%" h={16} br={4} />
        <Bone w="60%" h={12} br={4} />
      </View>
    </View>
  );
}

// ── Standings row skeleton ────────────────────────────────────
export function StandingRowSkeleton() {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 12, paddingHorizontal: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border + "40",
      gap: 10,
    }}>
      <Bone w={18} h={14} br={4} />
      <Bone w={28} h={28} br={14} />
      <View style={{ flex: 1 }}>
        <Bone w={60} h={14} br={4} />
      </View>
      <Bone w={20} h={14} br={4} />
      <Bone w={20} h={14} br={4} />
      <Bone w={20} h={14} br={4} />
      <Bone w={28} h={14} br={4} />
    </View>
  );
}

// ── Ranking row skeleton ──────────────────────────────────────
export function RankingRowSkeleton() {
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingVertical: 12, paddingHorizontal: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border + "40",
      gap: 12,
    }}>
      <Bone w={22} h={14} br={4} />
      <Bone w={36} h={36} br={18} />
      <View style={{ flex: 1, gap: 6 }}>
        <Bone w={100} h={14} br={4} />
        <Bone w={60} h={10} br={4} />
      </View>
      <Bone w={32} h={20} br={6} />
    </View>
  );
}

// ── Next-match card skeleton (home hero) ──────────────────────
export function NextMatchSkeleton() {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.xl, marginBottom: 20,
      borderWidth: 1, borderColor: colors.border,
      padding: 20,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20 }}>
        <Bone w={90} h={22} br={20} />
        <Bone w={70} h={22} br={6} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, alignItems: "center", gap: 10 }}>
          <Bone w={86} h={86} br={43} />
          <Bone w={40} h={18} br={6} />
        </View>
        <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 10 }}>
          <Bone w={40} h={22} br={6} />
          <Bone w={70} h={36} br={12} />
        </View>
        <View style={{ flex: 1, alignItems: "center", gap: 10 }}>
          <Bone w={86} h={86} br={43} />
          <Bone w={40} h={18} br={6} />
        </View>
      </View>
      <View style={{ marginTop: 16, height: 1, backgroundColor: colors.border + "40" }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <Bone w={120} h={12} br={4} />
        <Bone w={100} h={32} br={20} />
      </View>
    </View>
  );
}
