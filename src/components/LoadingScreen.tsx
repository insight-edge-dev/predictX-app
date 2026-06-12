import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, Dimensions } from "react-native";
import Svg, { Circle, Ellipse, Line } from "react-native-svg";
import { colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FIELD_SIZE = SCREEN_WIDTH * 1.6;
const CENTER = FIELD_SIZE / 2;

export default function LoadingScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const fieldSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();

    const fieldLoop = Animated.loop(
      Animated.timing(fieldSpin, {
        toValue: 1,
        duration: 90000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    fieldLoop.start();

    return () => {
      loop.stop();
      fieldLoop.stop();
    };
  }, [fade, scale, spin, fieldSpin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const fieldRotate = fieldSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Decorative cricket-ground rings, slowly rotating in the background */}
      <Animated.View
        style={{
          position: "absolute",
          width: FIELD_SIZE,
          height: FIELD_SIZE,
          transform: [{ rotate: fieldRotate }],
        }}
      >
        <Svg width={FIELD_SIZE} height={FIELD_SIZE} viewBox={`0 0 ${FIELD_SIZE} ${FIELD_SIZE}`}>
          {/* Boundary */}
          <Circle cx={CENTER} cy={CENTER} r={CENTER - 4} stroke={colors.accent} strokeOpacity={0.08} strokeWidth={1.5} fill="none" />
          {/* 30-yard circle */}
          <Circle cx={CENTER} cy={CENTER} r={FIELD_SIZE * 0.32} stroke={colors.accent} strokeOpacity={0.07} strokeWidth={1} fill="none" />
          {/* Pitch */}
          <Ellipse cx={CENTER} cy={CENTER} rx={FIELD_SIZE * 0.045} ry={FIELD_SIZE * 0.16} stroke={colors.accent} strokeOpacity={0.12} strokeWidth={1.5} fill="none" />
          {/* Crease lines */}
          <Line x1={CENTER - FIELD_SIZE * 0.045} y1={CENTER - FIELD_SIZE * 0.16} x2={CENTER + FIELD_SIZE * 0.045} y2={CENTER - FIELD_SIZE * 0.16} stroke={colors.accent} strokeOpacity={0.12} strokeWidth={1.5} />
          <Line x1={CENTER - FIELD_SIZE * 0.045} y1={CENTER + FIELD_SIZE * 0.16} x2={CENTER + FIELD_SIZE * 0.045} y2={CENTER + FIELD_SIZE * 0.16} stroke={colors.accent} strokeOpacity={0.12} strokeWidth={1.5} />
        </Svg>
      </Animated.View>

      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: "center" }}>
        <Text style={{ fontSize: 38, fontWeight: "900", letterSpacing: -1, color: colors.textPrimary }}>
          Predict<Text style={{ color: colors.accent }}>X</Text>
        </Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary, letterSpacing: 3, fontWeight: "600" }}>
          SPORTS INTELLIGENCE
        </Text>
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          bottom: 90,
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: colors.border,
          borderTopColor: colors.accent,
          opacity: fade,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}
