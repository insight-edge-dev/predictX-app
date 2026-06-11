import { View, Text, Pressable, Image, Animated } from "react-native";
import { useRef, memo } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Match } from "@/types/match";
import { formatMatchDate } from "@/utils/date";
import { getTeamColor, getTeamLogo, colors } from "@/theme/colors";
import { useCountdown } from "@/hooks/useCountdown";

interface NextMatchCardProps {
  match: Match;
  onPress?: (matchId: string) => void;
}

function TeamLogo({ imageId, shortName, size }: { imageId: string; shortName: string; size: number }) {
  const logoUrl = getTeamLogo(imageId, shortName);
  const color = getTeamColor(shortName);
  if (logoUrl) {
    return (
      <Image source={{ uri: logoUrl }} style={{ width: size, height: size }} resizeMode="contain" />
    );
  }
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color + "20", alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color, fontSize: size * 0.32, fontWeight: "700" }}>{shortName}</Text>
    </View>
  );
}

/**
 * Card shown on the Live tab when no match is currently live.
 * Displays the next upcoming IPL match with a live countdown.
 */
export const NextMatchCard = memo(function NextMatchCard({ match, onPress }: NextMatchCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const countdown = useCountdown(match.date);
  const team1Color = getTeamColor(match.team1.shortName);
  const team2Color = getTeamColor(match.team2.shortName);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <Pressable onPress={() => onPress?.(match.id)} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Team accent bar */}
        <View style={{ flexDirection: "row", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" }}>
          <View style={{ flex: 1, height: 3, backgroundColor: team1Color }} />
          <View style={{ flex: 1, height: 3, backgroundColor: team2Color }} />
        </View>

        <View
          style={{
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: colors.border,
            backgroundColor: colors.card,
          }}
        >
          {/* Next match label */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={{ backgroundColor: colors.accent + "15", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.accent + "30" }}>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "800", letterSpacing: 1 }}>
                NEXT MATCH
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>
              {formatMatchDate(match.date)}
            </Text>
          </View>

          {/* Teams */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <TeamLogo imageId={match.team1.logo} shortName={match.team1.shortName} size={52} />
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 8 }}>
                {match.team1.shortName}
              </Text>
            </View>

            {/* Countdown center */}
            <View style={{ alignItems: "center", paddingHorizontal: 8, flex: 1 }}>
              <Text style={{ color: colors.textSecondary + "60", fontSize: 12, fontWeight: "700", marginBottom: 8 }}>
                VS
              </Text>
              {!countdown.isExpired ? (
                <View style={{ alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: "600", marginLeft: 3, letterSpacing: 0.5 }}>
                      STARTS IN
                    </Text>
                  </View>
                  <Text style={{ color: colors.accent, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>
                    {countdown.hours > 0
                      ? `${countdown.hours}h ${String(countdown.minutes).padStart(2, "0")}m`
                      : `${countdown.minutes}m ${String(countdown.seconds).padStart(2, "0")}s`}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                    {match.time}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.success, fontSize: 13, fontWeight: "700" }}>
                  STARTING SOON
                </Text>
              )}
            </View>

            <View style={{ flex: 1, alignItems: "center" }}>
              <TeamLogo imageId={match.team2.logo} shortName={match.team2.shortName} size={52} />
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700", marginTop: 8 }}>
                {match.team2.shortName}
              </Text>
            </View>
          </View>

          {/* Venue */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 }}>
            <Ionicons name="location-outline" size={11} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 4 }}>
              {match.venue}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});
