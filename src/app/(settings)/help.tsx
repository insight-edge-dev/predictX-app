import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { useRouter } from "expo-router";
import { colors, spacing, font, radius } from "@/constants/theme";

// ── FAQ data ──────────────────────────────────────────────────

const FAQS = [
  {
    q: "What is PredictX?",
    a: "PredictX is a multi-league cricket companion app that gives you live scores, match schedules, squad information, historical statistics, and AI-powered match predictions — all in one place.",
  },
  {
    q: "How are match predictions calculated?",
    a: "Predictions use a 7-factor algorithm built on historical cricket data. Factors include team rating, recent form, head-to-head record, venue performance, batting strength, bowling strength, and toss impact. Each factor is weighted by its historical predictive value.",
  },
  {
    q: "How accurate are the predictions?",
    a: "Predictions are data-driven estimates based on historical patterns and current form. Cricket is inherently unpredictable — player injuries, weather, and pitch conditions on the day all play a role. Treat predictions as informed analysis, not guarantees.",
  },
  {
    q: "Where does the live match data come from?",
    a: "Live scores, squad information, and match fixtures are sourced from the Sportsmonks Cricket API, updated every 30 seconds during live matches.",
  },
  {
    q: "How do I add favourite teams?",
    a: "Go to Profile → Favourite Teams and tap the '+' button. Your favourites are used to personalise match highlights and predictions on the home screen.",
  },
  {
    q: "Why is a match showing as 'No Result'?",
    a: "A 'No Result' is recorded when a match is abandoned due to rain, bad light, or other external conditions before a result can be reached — typically before the minimum number of overs is completed.",
  },
  {
    q: "Can I use PredictX without an account?",
    a: "Currently an account is required to use PredictX. This allows us to save your preferences, favourite teams, and personalise your experience across devices.",
  },
  {
    q: "How do I delete my account?",
    a: "Go to Profile → scroll to the bottom → tap 'Delete Account'. This permanently deletes all your data immediately. Alternatively, email contact@predictx.app with subject 'Delete My Account' and we'll process it within 7 days.",
  },
  {
    q: "The app is showing outdated scores — what should I do?",
    a: "Pull down on the matches screen to refresh. If the issue persists, check your internet connection. Live data refreshes automatically every 30 seconds during active matches.",
  },
  {
    q: "Why don't I see squad info for upcoming matches?",
    a: "Official squads are confirmed by teams closer to match day. If a squad is unavailable, the app will show it as soon as it is announced by the team.",
  },
];

// ── Components ────────────────────────────────────────────────

function BackBar({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: colors.border + "50",
    }}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", marginRight: spacing.md })}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </Pressable>
      <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: "700", flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        backgroundColor: colors.card,
        borderRadius: radius.lg, borderWidth: 1, borderColor: open ? colors.accent + "35" : colors.border,
        marginBottom: spacing.sm, overflow: "hidden",
      })}
    >
      {/* Question row */}
      <View style={{
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.md,
      }}>
        <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.md, fontWeight: "600", lineHeight: 20 }}>
          {q}
        </Text>
        <View style={{
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: open ? colors.accent + "20" : colors.cardElevated,
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons
            name={open ? "chevron-up" : "chevron-down"}
            size={14}
            color={open ? colors.accent : colors.textMuted}
          />
        </View>
      </View>

      {/* Answer */}
      {open && (
        <View style={{
          paddingHorizontal: spacing.lg, paddingBottom: spacing.lg,
          borderTopWidth: 1, borderTopColor: colors.border + "50",
          paddingTop: spacing.md,
        }}>
          <Text style={{ color: colors.textSecondary, fontSize: font.sm, lineHeight: 21 }}>
            {a}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ContactCard() {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
      padding: spacing.xl, marginBottom: spacing.xl,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: colors.accent + "15",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="mail" size={22} color={colors.accent} />
        </View>
        <View>
          <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: "700" }}>
            Contact Support
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
            We typically reply within 24 hours
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => Linking.openURL("mailto:contact@predictx.app?subject=Support Request")}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          flexDirection: "row", alignItems: "center", justifyContent: "center",
          gap: spacing.sm,
          backgroundColor: colors.accent,
          borderRadius: radius.sm, paddingVertical: 13,
        })}
      >
        <Ionicons name="mail-outline" size={16} color={colors.bg} />
        <Text style={{ color: colors.bg, fontSize: font.md, fontWeight: "700" }}>
          contact@predictx.app
        </Text>
      </Pressable>

      {/* Quick contact options */}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
        <Pressable
          onPress={() => Linking.openURL("mailto:contact@predictx.app?subject=Bug Report")}
          style={({ pressed }) => ({
            flex: 1, opacity: pressed ? 0.7 : 1,
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: 6, backgroundColor: colors.cardElevated,
            borderRadius: radius.sm, paddingVertical: 10,
            borderWidth: 1, borderColor: colors.border,
          })}
        >
          <Ionicons name="bug-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: "600" }}>
            Report Bug
          </Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openURL("mailto:contact@predictx.app?subject=Feature Request")}
          style={({ pressed }) => ({
            flex: 1, opacity: pressed ? 0.7 : 1,
            flexDirection: "row", alignItems: "center", justifyContent: "center",
            gap: 6, backgroundColor: colors.cardElevated,
            borderRadius: radius.sm, paddingVertical: 10,
            borderWidth: 1, borderColor: colors.border,
          })}
        >
          <Ionicons name="bulb-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: "600" }}>
            Suggest Feature
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────

export default function HelpScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <BackBar title="Help & Support" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        >
          <ContactCard />

          <Text style={{
            color: colors.textMuted, fontSize: font.xs,
            fontWeight: "700", letterSpacing: 1.5, marginBottom: spacing.md,
          }}>
            FREQUENTLY ASKED QUESTIONS
          </Text>

          {FAQS.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}

          <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: "center", marginTop: spacing.xl }}>
            Still stuck? Email us at contact@predictx.app
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
