import { useEffect } from "react";
import { View, Text, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, Line } from "react-native-svg";
import { colors } from "@/constants/theme";
import { springs, timings } from "@/utils/anim";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FIELD_SIZE = SCREEN_WIDTH * 1.6;
const CENTER = FIELD_SIZE / 2;

export default function LoadingScreen() {
  const fade          = useSharedValue(0);
  const scale         = useSharedValue(0.92);
  const rotation      = useSharedValue(0);
  const fieldRotation = useSharedValue(0);

  useEffect(() => {
    fade.value  = withTiming(1, timings.slow);
    scale.value = withSpring(1, springs.bouncy);
    rotation.value      = withRepeat(withTiming(360, { duration: 900,   easing: Easing.linear }), -1, false);
    fieldRotation.value = withRepeat(withTiming(360, { duration: 90000, easing: Easing.linear }), -1, false);
  }, []);

  const fieldStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${fieldRotation.value}deg` }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity:   fade.value,
    transform: [{ scale: scale.value }],
  }));
  const spinStyle = useAnimatedStyle(() => ({
    opacity:   fade.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      {/* Decorative cricket-ground rings, slowly rotating in the background */}
      <Animated.View
        style={[{
          position: "absolute",
          width: FIELD_SIZE,
          height: FIELD_SIZE,
        }, fieldStyle]}
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

      <Animated.View style={[{ alignItems: "center" }, contentStyle]}>
        <Text style={{ fontSize: 38, fontWeight: "900", letterSpacing: -1, color: colors.textPrimary }}>
          Predict<Text style={{ color: colors.accent }}>X</Text>
        </Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary, letterSpacing: 3, fontWeight: "600" }}>
          SPORTS INTELLIGENCE
        </Text>
      </Animated.View>

      <Animated.View
        style={[{
          position: "absolute",
          bottom: 90,
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: 3,
          borderColor: colors.border,
          borderTopColor: colors.accent,
        }, spinStyle]}
      />
    </View>
  );
}
