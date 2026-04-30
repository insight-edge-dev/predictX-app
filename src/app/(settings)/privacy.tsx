import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { colors, spacing, font, radius } from "@/constants/theme";

// ── Types ─────────────────────────────────────────────────────

interface Section {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

// ── Data ──────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    icon: "person-circle-outline",
    title: "Account Data",
    body:
      "We store your display name and email address to identify your account. This information is held securely in our database and is never shared with third parties. You can update or delete your account at any time from the Profile screen.",
  },
  {
    icon: "analytics-outline",
    title: "Usage & Analytics",
    body:
      "CricketIQ does not collect behavioural tracking or advertising analytics. We may collect anonymous crash reports to improve app stability. No personally identifiable information is attached to these reports.",
  },
  {
    icon: "heart-outline",
    title: "Favourite Teams",
    body:
      "Your saved favourite teams are stored in our database linked to your account. This data is used exclusively to personalise your in-app experience — match highlights, quick access, and tailored tips.",
  },
  {
    icon: "notifications-outline",
    title: "Push Notifications",
    body:
      "If you enable notifications, your device token is stored to send you match alerts and score updates. You can withdraw consent at any time via your device settings or the Notifications toggle in Preferences.",
  },
  {
    icon: "server-outline",
    title: "Data Storage",
    body:
      "All user data is stored on Supabase — a SOC 2 Type II certified infrastructure provider hosted on AWS. Data is encrypted at rest and in transit using industry-standard TLS 1.2+.",
  },
  {
    icon: "share-social-outline",
    title: "Third-Party Services",
    body:
      "Match data is sourced from the Sportsmonks Cricket API. No user data is sent to Sportsmonks. News content is fetched from public RSS feeds. We do not sell or monetise your data in any form.",
  },
  {
    icon: "trash-outline",
    title: "Data Deletion",
    body:
      "You may request full deletion of your account and all associated data by emailing cricketiq@gmail.com with the subject line \"Delete My Account\". Requests are processed within 7 business days.",
  },
  {
    icon: "refresh-outline",
    title: "Policy Updates",
    body:
      "This privacy policy may be updated to reflect changes in our practices or legal requirements. Significant changes will be communicated via in-app notice. Continued use of the app constitutes acceptance of the updated policy.",
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
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          flexDirection: "row", alignItems: "center", marginRight: spacing.md,
        })}
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

function SectionCard({ item }: { item: Section }) {
  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
      padding: spacing.lg, marginBottom: spacing.md,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm }}>
        <View style={{
          width: 32, height: 32, borderRadius: 8,
          backgroundColor: colors.accent + "15",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name={item.icon} size={16} color={colors.accent} />
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: "700" }}>
          {item.title}
        </Text>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: font.sm, lineHeight: 20 }}>
        {item.body}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────

export default function PrivacyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <BackBar title="Privacy & Security" />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        >
          {/* Hero */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
            padding: spacing.xl, marginBottom: spacing.xl, alignItems: "center",
          }}>
            <View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: colors.accent + "15",
              alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
            }}>
              <Ionicons name="shield-checkmark" size={26} color={colors.accent} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: "800", marginBottom: spacing.sm }}>
              Your Privacy Matters
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: "center", lineHeight: 20 }}>
              CricketIQ is built with a privacy-first approach. We collect only what is necessary to deliver a great cricket experience — nothing more.
            </Text>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: "700", letterSpacing: 1.5, marginBottom: spacing.md }}>
            WHAT WE COLLECT & WHY
          </Text>

          {SECTIONS.map((s) => <SectionCard key={s.title} item={s} />)}

          {/* Last updated */}
          <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: "center", marginTop: spacing.md }}>
            Last updated · April 2026
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
