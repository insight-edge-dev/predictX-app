import {
  View, Text, Pressable, ScrollView, Image,
  TextInput, ActivityIndicator, Modal, Alert, Platform,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { updateProfile } from "@/services/profileService";
import { getTeamColor, getTeamLogo } from "@/theme/colors";
import { IPL_TEAMS } from "@/constants/iplTeams";
import { colors, spacing, font, radius } from "@/constants/theme";

const ALL_TEAMS = Object.values(IPL_TEAMS);

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: {},
});

const avatarShadow = Platform.select({
  ios: {
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  android: { elevation: 4 },
  default: {},
});

// ── Avatar ────────────────────────────────────────────────────

function Avatar({ name, size = 72, onGradient = false }: { name: string; size?: number; onGradient?: boolean }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{
      width: size + 6, height: size + 6, borderRadius: (size + 6) / 2,
      padding: 2, borderWidth: 2,
      borderColor: onGradient ? "rgba(255,255,255,0.5)" : colors.accent + "50",
      backgroundColor: onGradient ? "rgba(255,255,255,0.25)" : colors.accent + "15",
      ...(onGradient ? avatarShadow : null),
    }}>
      <View style={{
        flex: 1, borderRadius: size / 2,
        backgroundColor: onGradient ? "#fff" : colors.accent + "20",
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ color: colors.accent, fontSize: size * 0.35, fontWeight: "900" }}>
          {initials}
        </Text>
      </View>
    </View>
  );
}

// ── Stat box ──────────────────────────────────────────────────

function StatBox({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: color ?? colors.accent, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 }}>
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Team Circle ───────────────────────────────────────────────

function TeamCircle({ shortName, size = 52 }: { shortName: string; size?: number }) {
  const color   = getTeamColor(shortName);
  const logoUrl = getTeamLogo("", shortName);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "18",
      borderWidth: 1.5, borderColor: color + "50",
      alignItems: "center", justifyContent: "center",
    }}>
      {logoUrl
        ? <Image source={{ uri: logoUrl }} style={{ width: size * 0.65, height: size * 0.65 }} resizeMode="contain" />
        : <Text style={{ color, fontSize: size * 0.3, fontWeight: "800" }}>{shortName}</Text>
      }
    </View>
  );
}

// ── Settings Row ──────────────────────────────────────────────

function SettingsRow({ icon, label, danger, value, onPress, last }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; danger?: boolean; value?: string;
  onPress?: () => void; last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.75 : 1,
        flexDirection: "row", alignItems: "center",
        paddingVertical: 15, paddingHorizontal: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: danger ? colors.danger + "18" : colors.cardElevated,
        borderWidth: 1, borderColor: danger ? colors.danger + "30" : colors.border,
        alignItems: "center", justifyContent: "center", marginRight: 14,
      }}>
        <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <Text style={{ flex: 1, fontSize: font.base, fontWeight: "600", color: danger ? colors.danger : colors.textPrimary }}>
        {label}
      </Text>
      {value ? <Text style={{ color: colors.textMuted, fontSize: font.sm, marginRight: 6 }}>{value}</Text> : null}
      {!danger && <Ionicons name="chevron-forward" size={15} color={colors.border} />}
    </Pressable>
  );
}

// ── Team Picker Modal ─────────────────────────────────────────

function TeamPickerModal({ visible, selected, onClose, onToggle }: {
  visible: boolean; selected: string[];
  onClose: () => void; onToggle: (s: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: 1, borderColor: colors.border,
          paddingBottom: 40,
        }}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
            <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: "800" }}>
              Favourite Teams
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={{ backgroundColor: colors.accent + "20", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: colors.accent + "40" }}>
                <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: "700" }}>Done</Text>
              </View>
            </Pressable>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: font.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
            Tap to add or remove teams
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {ALL_TEAMS.map((team) => {
              const isSelected = selected.includes(team.shortName);
              const color      = getTeamColor(team.shortName);
              const logoUrl    = getTeamLogo("", team.shortName);
              return (
                <Pressable
                  key={team.shortName}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(team.shortName); }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.75 : 1,
                    width: "18%", alignItems: "center", gap: 6,
                    paddingVertical: spacing.sm, borderRadius: radius.md,
                    backgroundColor: isSelected ? color + "20" : "transparent",
                    borderWidth: 1.5,
                    borderColor: isSelected ? color + "70" : "transparent",
                  })}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 23,
                    backgroundColor: color + "18",
                    borderWidth: 1.5, borderColor: isSelected ? color : color + "40",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {logoUrl
                      ? <Image source={{ uri: logoUrl }} style={{ width: 30, height: 30 }} resizeMode="contain" />
                      : <Text style={{ color, fontSize: 11, fontWeight: "800" }}>{team.shortName}</Text>
                    }
                  </View>
                  <Text style={{ color: isSelected ? color : colors.textMuted, fontSize: 9, fontWeight: "700" }}>
                    {team.shortName}
                  </Text>
                  {isSelected && (
                    <View style={{ position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="checkmark" size={9} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, user, logout, deleteAccount, refreshProfile, updateFavouriteTeams } = useAuth();
  const { league } = useLeague();
  const router = useRouter();

  const displayName    = profile?.displayName || "Cricket Fan";
  const phone          = user?.phone?.replace("+91", "") ?? "";
  const favouriteTeams: string[] = profile?.favoriteTeams ?? [];

  const memberSince = (() => {
    // profile.createdAt comes from Supabase profiles table created_at
    // which may be null for older accounts. Fall back to auth user's created_at.
    const raw = profile?.createdAt || (user as any)?.created_at || '';
    if (!raw) return "—";
    try { return new Date(raw).toLocaleDateString("en-IN", { month: "short", year: "numeric" }); }
    catch { return "—"; }
  })();

  const [editing,    setEditing]    = useState(false);
  const [nameInput,  setNameInput]  = useState(displayName);
  const [saving,     setSaving]     = useState(false);
  const [saveMsg,    setSaveMsg]    = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const result = await deleteAccount();
            if (result.success) {
              router.replace("/login");
            } else {
              Alert.alert("Error", result.error ?? "Failed to delete account. Please try again.");
            }
          },
        },
      ],
    );
  }

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    setSaving(true);
    const result = await updateProfile(user?.id ?? '', { displayName: nameInput.trim() });
    setSaving(false);
    if (result.error) { setSaveMsg(result.error); }
    else { setSaveMsg("Saved!"); await refreshProfile(); setEditing(false); }
  }

  async function handleToggleTeam(shortName: string) {
    const next = favouriteTeams.includes(shortName)
      ? favouriteTeams.filter(t => t !== shortName)
      : [...favouriteTeams, shortName];
    await updateFavouriteTeams(next);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >

          {/* ── Hero Section ── */}
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.xl,
              paddingBottom: spacing.xxl + 36,
              borderBottomLeftRadius: radius.xxl,
              borderBottomRightRadius: radius.xxl,
              overflow: "hidden",
            }}
          >
            {/* Decorative shapes */}
            <View pointerEvents="none" style={{
              position: "absolute", top: -60, right: -40,
              width: 170, height: 170, borderRadius: 85,
              backgroundColor: "rgba(255,255,255,0.08)",
            }} />
            <View pointerEvents="none" style={{
              position: "absolute", bottom: -50, left: -40,
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: "rgba(255,255,255,0.06)",
            }} />

            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: font.xs, fontWeight: "700", letterSpacing: 2, marginBottom: spacing.xl }}>
              MY PROFILE
            </Text>

            {editing ? (
              <View style={{ gap: spacing.md }}>
                <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: font.xs, fontWeight: "700", letterSpacing: 1 }}>DISPLAY NAME</Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  style={{
                    color: colors.textPrimary, fontSize: font.lg, fontWeight: "700",
                    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12,
                    backgroundColor: "#fff",
                  }}
                />
                {saveMsg ? (
                  <Text style={{ color: saveMsg === "Saved!" ? "#bbf7d0" : "#fecaca", fontSize: font.sm, fontWeight: "600" }}>{saveMsg}</Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Pressable
                    onPress={() => { setEditing(false); setSaveMsg(""); }}
                    style={({ pressed }) => ({
                      flex: 1, opacity: pressed ? 0.7 : 1, borderRadius: radius.md,
                      paddingVertical: 13, backgroundColor: "rgba(255,255,255,0.18)",
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: font.sm }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    disabled={saving}
                    style={({ pressed }) => ({
                      flex: 1, opacity: pressed || saving ? 0.7 : 1,
                      borderRadius: radius.md, paddingVertical: 13,
                      backgroundColor: "#fff", alignItems: "center",
                    })}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Text style={{ color: colors.accent, fontWeight: "800", fontSize: font.sm }}>Save</Text>
                    }
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
                <Avatar name={displayName} size={68} onGradient />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: font.xl, fontWeight: "900", letterSpacing: -0.3, marginBottom: 4 }}>
                    {displayName}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: font.sm }}>
                    +91 {phone || "—"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => { setNameInput(displayName); setSaveMsg(""); setEditing(true); }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.18)",
                    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
                    alignItems: "center", justifyContent: "center",
                  })}
                >
                  <Ionicons name="pencil-outline" size={16} color="#fff" />
                </Pressable>
              </View>
            )}
          </LinearGradient>

          {/* Floating stats card */}
          {!editing && (
            <View style={{
              flexDirection: "row", marginHorizontal: spacing.lg, marginTop: -32,
              backgroundColor: colors.card,
              borderRadius: radius.lg, padding: spacing.lg,
              ...cardShadow,
            }}>
              <StatBox value={favouriteTeams.length || "—"} label="Fav Teams" color={colors.accent} />
              <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <StatBox value={league.short} label="League" color="#a78bfa" />
              <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />
              <StatBox value={memberSince} label="Joined" color={colors.success} />
            </View>
          )}

          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xl }}>

            {/* ── Favourite Teams ── */}
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: spacing.md }}>
              FAVOURITE TEAMS
            </Text>
            <View style={{
              backgroundColor: colors.card,
              borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
              padding: spacing.lg, marginBottom: spacing.xl,
              ...cardShadow,
            }}>
              {favouriteTeams.length === 0 ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm,
                  })}
                >
                  <View style={{
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: colors.accentDim,
                    borderWidth: 1.5, borderColor: colors.accent + "30", borderStyle: "dashed",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="add" size={24} color={colors.accent} />
                  </View>
                  <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: "600" }}>
                    Add your favourite teams
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                    Get personalised predictions & news
                  </Text>
                </Pressable>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md }}>
                  {favouriteTeams.map((shortName) => (
                    <View key={shortName} style={{ alignItems: "center", gap: 6 }}>
                      <TeamCircle shortName={shortName} size={52} />
                      <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600" }}>{shortName}</Text>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => setPickerOpen(true)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignItems: "center", gap: 6 })}
                  >
                    <View style={{
                      width: 52, height: 52, borderRadius: 26,
                      borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                    </View>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600" }}>Edit</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* ── Account ── */}
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: spacing.md }}>
              ACCOUNT
            </Text>
            <View style={{ borderRadius: radius.xl, marginBottom: spacing.xl, ...cardShadow }}>
              <View style={{
                backgroundColor: colors.card,
                borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
                overflow: "hidden",
              }}>
                <SettingsRow icon="notifications-outline"   label="Notifications"    onPress={() => router.push("/(settings)/notifications")} />
                <SettingsRow icon="shield-checkmark-outline" label="Privacy & Security" onPress={() => router.push("/(settings)/privacy")} />
                <SettingsRow icon="help-circle-outline"      label="Help & Support"   onPress={() => router.push("/(settings)/help")} last />
              </View>
            </View>

            {/* ── Delete Account ── */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeleteAccount(); }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: spacing.sm, backgroundColor: "transparent",
                borderRadius: radius.xl, paddingVertical: 14,
                marginBottom: spacing.sm,
              })}
            >
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              <Text style={{ color: colors.textMuted, fontSize: font.sm, fontWeight: "600" }}>Delete Account</Text>
            </Pressable>

            {/* ── Sign Out ── */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLogout(); }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: spacing.sm, backgroundColor: colors.danger + "10",
                borderRadius: radius.xl, paddingVertical: 16,
                borderWidth: 1, borderColor: colors.danger + "25",
                marginBottom: spacing.xl,
              })}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: font.base, fontWeight: "700" }}>Sign Out</Text>
            </Pressable>

            <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: "center" }}>
              PredictX v1.0.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      <TeamPickerModal
        visible={pickerOpen}
        selected={favouriteTeams}
        onClose={() => setPickerOpen(false)}
        onToggle={handleToggleTeam}
      />
    </View>
  );
}
