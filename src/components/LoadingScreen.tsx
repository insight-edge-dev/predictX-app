import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";

const ACCENT = "#E6FF00";

export default function LoadingScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const spin = useRef(new Animated.Value(0)).current;

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
    return () => loop.stop();
  }, [fade, scale, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={{ flex: 1, backgroundColor: "#0B0B0B", alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={{ opacity: fade, transform: [{ scale }], alignItems: "center" }}>
        <Text style={{ fontSize: 38, fontWeight: "900", letterSpacing: -1, color: "#fff" }}>
          Predict<Text style={{ color: ACCENT }}>X</Text>
        </Text>
        <Text style={{ marginTop: 8, fontSize: 12, color: "#6B7280", letterSpacing: 3, fontWeight: "600" }}>
          CRICKET INTELLIGENCE
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
          borderColor: "#1F1F1F",
          borderTopColor: ACCENT,
          opacity: fade,
          transform: [{ rotate }],
        }}
      />
    </View>
  );
}
