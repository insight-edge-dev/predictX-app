import {
  View, Text, Pressable, ScrollView, Image,
  TextInput, ActivityIndicator, Modal,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile } from "@/services/profileService";
import { getTeamColor, getTeamLogo } from "@/theme/colors";
import { IPL_TEAMS } from "@/constants/iplTeams";
import { colors, spacing, font, radius } from "@/constants/theme";

const ALL_TEAMS = Object.values(IPL_TEAMS);

// ── Avatar initials ───────────────────────────────────────────

function Avatar({ name, size = 60 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: colors.accent + "20",
      borderWidth: 2, borderColor: colors.accent + "35",
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: colors.accent, fontSize: size * 0.36, fontWeight: "800" }}>
        {initials}
      </Text>
    </View>
  );
}

// ── Team logo circle ──────────────────────────────────────────

function TeamCircle({ shortName, size = 50 }: { shortName: string; size?: number }) {
  const color  = getTeamColor(shortName);
  const logoUrl = getTeamLogo("", shortName);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: color + "18",
      borderWidth: 1.5, borderColor: color + "50",
      alignItems: "center", justifyContent: "center",
    }}>
      {logoUrl
        ? <Image source={{ uri: logoUrl }} style={{ width: size * 0.66, height: size * 0.66 }} resizeMode="contain" />
        : <Text style={{ color, fontSize: size * 0.3, fontWeight: "800" }}>{shortName}</Text>
      }
    </View>
  );
}

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ title }: { title: string }) {
  return (
    <Text style={{
      color: colors.textMuted, fontSize: font.xs, fontWeight: "700",
      letterSpacing: 1.5, marginBottom: spacing.sm, marginTop: spacing.xl, paddingHorizontal: 4,
    }}>
      {title}
    </Text>
  );
}

// ── Settings row ──────────────────────────────────────────────

function SettingsRow({
  icon, label, danger, value, onPress, last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  danger?: boolean;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14, paddingHorizontal: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border + "50",
      })}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 8,
        backgroundColor: danger ? colors.danger + "15" : colors.cardElevated,
        alignItems: "center", justifyContent: "center", marginRight: 14,
      }}>
        <Ionicons name={icon} size={16} color={danger ? colors.danger : colors.textSecondary} />
      </View>
      <Text style={{ flex: 1, fontSize: font.md, fontWeight: "500", color: danger ? colors.danger : colors.textPrimary }}>
        {label}
      </Text>
      {value ? <Text style={{ color: colors.textMuted, fontSize: font.sm, marginRight: 6 }}>{value}</Text> : null}
      {!danger && <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />}
    </Pressable>
  );
}

// ── Team picker modal ─────────────────────────────────────────

function TeamPickerModal({
  visible, selected, onClose, onToggle,
}: {
  visible: boolean;
  selected: string[];
  onClose: () => void;
  onToggle: (shortName: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          borderTopWidth: 1, borderColor: colors.border,
          paddingBottom: 40,
        }}>
          {/* Handle bar */}
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Title */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
            <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: "700" }}>
              Choose Your Teams
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="checkmark-circle" size={28} color={colors.accent} />
            </Pressable>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: font.sm, paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
            Tap a team to add or remove it from your favourites
          </Text>

          {/* Teams grid */}
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
                    width: "18%",
                    alignItems: "center", gap: 6,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: isSelected ? color + "18" : "transparent",
                    borderWidth: 1.5,
                    borderColor: isSelected ? color + "60" : "transparent",
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
                    <View style={{
                      position: "absolute", top: 4, right: 4,
                      width: 14, height: 14, borderRadius: 7,
                      backgroundColor: color, alignItems: "center", justifyContent: "center",
                    }}>
                      <Ionicons name="checkmark" size={9} color="#fff" />
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

// ── Main screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, user, logout, refreshProfile, updateFavouriteTeams } = useAuth();
  const router = useRouter();

  const displayName   = profile?.displayName || "Cricket Fan";
  const email         = user?.email || "—";
  const favouriteTeams: string[] = profile?.favoriteTeams ?? [];

  const [editing,     setEditing]     = useState(false);
  const [nameInput,   setNameInput]   = useState(displayName);
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");
  const [pickerOpen,  setPickerOpen]  = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleSaveName() {
    if (!user?.id || !nameInput.trim()) return;
    setSaving(true);
    const result = await updateProfile(user.id, { displayName: nameInput.trim() });
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
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 100 }}
        >
          {/* ── Page title ── */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: "700", letterSpacing: 2, marginBottom: 4 }}>
              IPL 2026
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: -0.5 }}>
              Profile
            </Text>
          </View>

          {/* ── Identity card ── */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
            overflow: "hidden",
          }}>
            <View style={{ height: 3, backgroundColor: colors.accent + "60" }} />
            <View style={{ padding: spacing.xl }}>
              {editing ? (
                <View style={{ gap: spacing.md }}>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: "700", letterSpacing: 1 }}>DISPLAY NAME</Text>
                  <TextInput
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoFocus
                    placeholder="Your name"
                    placeholderTextColor={colors.textMuted}
                    style={{
                      color: colors.textPrimary, fontSize: font.lg, fontWeight: "700",
                      borderWidth: 1, borderColor: colors.accent + "50",
                      borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10,
                      backgroundColor: colors.cardElevated,
                    }}
                  />
                  {saveMsg ? (
                    <Text style={{ color: saveMsg === "Saved!" ? colors.success : colors.danger, fontSize: font.sm }}>{saveMsg}</Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 4 }}>
                    <Pressable
                      onPress={() => { setEditing(false); setSaveMsg(""); }}
                      style={({ pressed }) => ({
                        flex: 1, opacity: pressed ? 0.7 : 1, borderRadius: radius.sm,
                        paddingVertical: 11, backgroundColor: colors.cardElevated,
                        borderWidth: 1, borderColor: colors.border, alignItems: "center",
                      })}
                    >
                      <Text style={{ color: colors.textSecondary, fontWeight: "600", fontSize: font.sm }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveName}
                      disabled={saving}
                      style={({ pressed }) => ({
                        flex: 1, opacity: pressed || saving ? 0.7 : 1,
                        borderRadius: radius.sm, paddingVertical: 11,
                        backgroundColor: colors.accent, alignItems: "center",
                      })}
                    >
                      {saving
                        ? <ActivityIndicator size="small" color={colors.bg} />
                        : <Text style={{ color: colors.bg, fontWeight: "700", fontSize: font.sm }}>Save</Text>
                      }
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
                  <Avatar name={displayName} size={60} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: "700", marginBottom: 3 }}>
                      {displayName}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.sm }}>{email}</Text>
                  </View>
                  <Pressable
                    onPress={() => { setNameInput(displayName); setSaveMsg(""); setEditing(true); }}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      paddingHorizontal: 14, paddingVertical: 7,
                      backgroundColor: colors.cardElevated,
                      borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
                    })}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: "600" }}>Edit</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>

          {/* ── Favourite teams ── */}
          <SectionLabel title="FAVOURITE TEAMS" />
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
            padding: spacing.lg,
          }}>
            {favouriteTeams.length === 0 ? (
              /* Empty state */
              <Pressable
                onPress={() => setPickerOpen(true)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  alignItems: "center", paddingVertical: spacing.lg, gap: spacing.sm,
                })}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 24,
                  borderWidth: 2, borderColor: colors.border, borderStyle: "dashed",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="add" size={22} color={colors.textMuted} />
                </View>
                <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                  Add your favourite teams
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
                {/* Add more button */}
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, alignItems: "center", gap: 6 })}
                >
                  <View style={{
                    width: 52, height: 52, borderRadius: 26,
                    borderWidth: 1.5, borderColor: colors.border, borderStyle: "dashed",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="add" size={20} color={colors.textMuted} />
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: "600" }}>Edit</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ── Account ── */}
          <SectionLabel title="ACCOUNT" />
          <View style={{
            backgroundColor: colors.card,
            borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border,
            overflow: "hidden",
          }}>
            <SettingsRow icon="shield-checkmark-outline" label="Privacy & Security" onPress={() => router.push("/(settings)/privacy")} />
            <SettingsRow icon="help-circle-outline"      label="Help & Support"     onPress={() => router.push("/(settings)/help")} last />
          </View>

          {/* ── Sign out ── */}
          <View style={{ marginTop: spacing.xl }}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLogout(); }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                gap: spacing.sm, backgroundColor: colors.danger + "12",
                borderRadius: radius.xl, paddingVertical: 15,
                borderWidth: 1, borderColor: colors.danger + "30",
              })}
            >
              <Ionicons name="log-out-outline" size={18} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: font.md, fontWeight: "700" }}>Sign Out</Text>
            </Pressable>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: "center", marginTop: spacing.xl }}>
            CricketIQ v1.0.0 · IPL 2026
          </Text>
        </ScrollView>
      </SafeAreaView>

      {/* ── Team picker modal ── */}
      <TeamPickerModal
        visible={pickerOpen}
        selected={favouriteTeams}
        onClose={() => setPickerOpen(false)}
        onToggle={handleToggleTeam}
      />
    </View>
  );
}
