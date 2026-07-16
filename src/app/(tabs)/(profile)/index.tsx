import {
  View, Text, Pressable, ScrollView, Image,
  TextInput, ActivityIndicator, Modal, Alert, Platform, StyleSheet,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useLeague } from "@/contexts/LeagueContext";
import { updateProfile, uploadAvatarImage } from "@/services/profileService";
import { getTeamColor, getTeamLogo } from "@/theme/colors";
import { useMyPredictionStats } from "@/hooks/useUserPrediction";
import { IPL_TEAMS } from "@/constants/iplTeams";
import { colors, spacing, font, radius } from "@/constants/theme";

const ALL_TEAMS = Object.values(IPL_TEAMS);

const card: object = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: "#E5E7EB",
  ...Platform.select({
    ios:     { shadowColor: "#1E40AF", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 2 },
    default: {},
  }),
};

// ── Icon Bubble ───────────────────────────────────────────────

function IconBubble({
  icon, iconColor, bg, size = 50,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; bg: string; size?: number;
}) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: "center", justifyContent: "center",
    }}>
      <Ionicons name={icon} size={size * 0.46} color={iconColor} />
    </View>
  );
}

// ── Stat Column (icon + number + label) with optional divider ─

function StatCol({
  icon, iconColor, bg, value, label, divider,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; bg: string;
  value: string | number; label: string;
  divider?: boolean;
}) {
  return (
    <>
      <View style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 4 }}>
        <IconBubble icon={icon} iconColor={iconColor} bg={bg} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          style={{ color: "#111827", fontSize: 18, fontWeight: "800", letterSpacing: -0.3, width: "100%", textAlign: "center" }}
        >
          {value}
        </Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "500", textAlign: "center", width: "100%" }}>
          {label}
        </Text>
      </View>
      {divider && (
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: "#E5E7EB", marginVertical: 8 }} />
      )}
    </>
  );
}

// ── Avatar ────────────────────────────────────────────────────

function Avatar({
  name, avatarUrl, size = 80, onPress, uploading = false,
}: {
  name: string; avatarUrl?: string | null; size?: number;
  onPress?: () => void; uploading?: boolean;
}) {
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ position: "relative" }}>
      {/* Blue accent ring */}
      <View style={{
        width: size + 6, height: size + 6, borderRadius: (size + 6) / 2,
        borderWidth: 2.5, borderColor: "#BFDBFE",
        alignItems: "center", justifyContent: "center",
        backgroundColor: "transparent",
        ...Platform.select({
          ios: { shadowColor: "#2563EB", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
          android: { elevation: 4 },
          default: {},
        }),
      }}>
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          overflow: "hidden", backgroundColor: "#EFF6FF",
        }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.accent, fontSize: size * 0.3, fontWeight: "800" }}>{initials}</Text>
            </View>
          )}
          {uploading && (
            <View style={{
              ...StyleSheet.absoluteFillObject,
              backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
            }}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          )}
        </View>
      </View>
      {onPress && (
        <View style={{
          position: "absolute", bottom: 2, right: 2,
          width: 24, height: 24, borderRadius: 12,
          backgroundColor: "#2563EB",
          borderWidth: 2, borderColor: "#fff",
          alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="camera" size={11} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

// ── Team Row ──────────────────────────────────────────────────

function TeamRow({ shortName, last, onPress }: {
  shortName: string; last?: boolean; onPress: () => void;
}) {
  const teamData = ALL_TEAMS.find(t => t.shortName === shortName);
  const teamColor = getTeamColor(shortName);
  const logoUrl   = getTeamLogo("", shortName);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: "row", alignItems: "center",
        paddingVertical: 16, paddingHorizontal: 20,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: "#F3F4F6",
        gap: 14,
      })}
    >
      <View style={{
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: teamColor + "12",
        borderWidth: 1.5, borderColor: teamColor + "30",
        alignItems: "center", justifyContent: "center",
      }}>
        {logoUrl
          ? <Image source={{ uri: logoUrl }} style={{ width: 34, height: 34 }} resizeMode="contain" />
          : <Text style={{ color: teamColor, fontSize: 12, fontWeight: "800" }}>{shortName}</Text>
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#111827", fontSize: 15, fontWeight: "700", marginBottom: 3 }}>{shortName}</Text>
        <Text style={{ color: "#9CA3AF", fontSize: 13 }}>{teamData?.name ?? shortName}</Text>
      </View>
      <View style={{
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

// ── Settings Row ──────────────────────────────────────────────

function SettingsRow({ icon, iconColor, iconBg, label, subtitle, onPress, last }: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress?.(); }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        flexDirection: "row", alignItems: "center",
        paddingVertical: 14, paddingHorizontal: 16, gap: 14,
        borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
        borderBottomColor: "#F3F4F6",
      })}
    >
      <View style={{
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: iconBg,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: iconColor === "#DC2626" ? "#DC2626" : "#111827", fontSize: 15, fontWeight: "600", marginBottom: subtitle ? 2 : 0 }}>
          {label}
        </Text>
        {subtitle && <Text style={{ color: "#9CA3AF", fontSize: 13 }}>{subtitle}</Text>}
      </View>
      <View style={{
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name="chevron-forward" size={13} color="#9CA3AF" />
      </View>
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
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}} style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB",
          paddingBottom: 40,
        }}>
          <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB" }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ color: "#111827", fontSize: 20, fontWeight: "800" }}>Favourite Teams</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <View style={{ backgroundColor: colors.accentDim, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
                <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "700" }}>Done</Text>
              </View>
            </Pressable>
          </View>
          <Text style={{ color: "#9CA3AF", fontSize: 13, paddingHorizontal: 20, marginBottom: 16 }}>
            Tap to add or remove teams
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 8 }}>
            {ALL_TEAMS.map((team) => {
              const isSel    = selected.includes(team.shortName);
              const tc       = getTeamColor(team.shortName);
              const logoUrl  = getTeamLogo("", team.shortName);
              return (
                <Pressable
                  key={team.shortName}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(team.shortName); }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.75 : 1,
                    width: "18%", alignItems: "center", gap: 6,
                    paddingVertical: 8, borderRadius: 10,
                    backgroundColor: isSel ? tc + "18" : "transparent",
                    borderWidth: 1.5, borderColor: isSel ? tc + "70" : "transparent",
                  })}
                >
                  <View style={{
                    width: 46, height: 46, borderRadius: 23,
                    backgroundColor: tc + "18",
                    borderWidth: 1.5, borderColor: isSel ? tc : tc + "40",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    {logoUrl
                      ? <Image source={{ uri: logoUrl }} style={{ width: 30, height: 30 }} resizeMode="contain" />
                      : <Text style={{ color: tc, fontSize: 11, fontWeight: "800" }}>{team.shortName}</Text>
                    }
                  </View>
                  <Text style={{ color: isSel ? tc : "#9CA3AF", fontSize: 9, fontWeight: "700" }}>
                    {team.shortName}
                  </Text>
                  {isSel && (
                    <View style={{ position: "absolute", top: 3, right: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: tc, alignItems: "center", justifyContent: "center" }}>
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

// ── Main Screen ───────────────────────────────────────────────

export default function ProfileScreen() {
  const { profile, user, logout, deleteAccount, refreshProfile, updateFavouriteTeams, isAuthenticated } = useAuth();
  const { league } = useLeague();
  const router = useRouter();
  const { data: predStats } = useMyPredictionStats(isAuthenticated);

  const displayName    = profile?.displayName || "Cricket Fan";
  const phone          = user?.phone ?? "";
  const favouriteTeams: string[] = profile?.favoriteTeams ?? [];

  const memberSince = (() => {
    const raw = profile?.createdAt || (user as any)?.created_at || '';
    if (!raw) return null;
    try { return new Date(raw).toLocaleDateString("en-IN", { month: "long", year: "numeric" }); }
    catch { return null; }
  })();

  const [editing,         setEditing]         = useState(false);
  const [nameInput,       setNameInput]       = useState(displayName);
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState("");
  const [pickerOpen,      setPickerOpen]      = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarUrl    = profile?.avatarUrl ?? null;
  const hasPredStats = predStats && predStats.total > 0;

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
          text: "Delete", style: "destructive",
          onPress: async () => {
            const r = await deleteAccount();
            if (r.success) router.replace("/login");
            else Alert.alert("Error", r.error ?? "Failed to delete account.");
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
    if (result.error) setSaveMsg(result.error);
    else { setSaveMsg("Saved!"); await refreshProfile(); setEditing(false); }
  }

  async function handleAvatarPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to your photo library to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    const { error } = await uploadAvatarImage(asset.uri, asset.mimeType ?? "image/jpeg");
    setUploadingAvatar(false);
    if (error) Alert.alert("Upload failed", error);
    else await refreshProfile();
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* ── Gradient hero ── */}
          <LinearGradient
            colors={["#BFDBFE", "#DBEAFE", "#EFF6FF", colors.bg]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: 20, paddingBottom: 32, paddingHorizontal: 20, overflow: "hidden" }}
          >
            {/* Decorative blobs */}
            <View pointerEvents="none" style={{
              position: "absolute", top: -40, right: -40,
              width: 160, height: 160, borderRadius: 80,
              backgroundColor: "rgba(37,99,235,0.08)",
            }} />
            <View pointerEvents="none" style={{
              position: "absolute", bottom: 0, right: 60,
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: "rgba(37,99,235,0.05)",
            }} />

            {/* Title */}
            <Text style={{ color: "#1E3A8A", fontSize: 30, fontWeight: "800", letterSpacing: -0.6, marginBottom: 24 }}>
              Profile
            </Text>

            {editing ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: "#3B82F6", fontSize: 10, fontWeight: "700", letterSpacing: 1.5 }}>
                  DISPLAY NAME
                </Text>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  placeholder="Your name"
                  placeholderTextColor="#93C5FD"
                  style={{
                    color: "#1E3A8A", fontSize: 17, fontWeight: "700",
                    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
                    backgroundColor: "rgba(255,255,255,0.8)",
                    borderWidth: 1.5, borderColor: "#BFDBFE",
                  }}
                />
                {saveMsg ? (
                  <Text style={{ color: saveMsg === "Saved!" ? "#16A34A" : "#DC2626", fontSize: 13, fontWeight: "600" }}>
                    {saveMsg}
                  </Text>
                ) : null}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => { setEditing(false); setSaveMsg(""); }}
                    style={({ pressed }) => ({
                      flex: 1, opacity: pressed ? 0.6 : 1, borderRadius: 12,
                      paddingVertical: 14, backgroundColor: "rgba(255,255,255,0.6)",
                      borderWidth: 1.5, borderColor: "#BFDBFE", alignItems: "center",
                    })}
                  >
                    <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveName}
                    disabled={saving}
                    style={({ pressed }) => ({
                      flex: 1, opacity: pressed || saving ? 0.7 : 1, borderRadius: 12,
                      paddingVertical: 14, backgroundColor: colors.accent, alignItems: "center",
                    })}
                  >
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Save</Text>
                    }
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
                <Avatar
                  name={displayName}
                  avatarUrl={avatarUrl}
                  size={80}
                  onPress={handleAvatarPress}
                  uploading={uploadingAvatar}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6, flexWrap: "wrap" }}>
                    <Text style={{ color: "#1E3A8A", fontSize: 23, fontWeight: "800", letterSpacing: -0.4 }}>
                      {displayName}
                    </Text>
                    <Ionicons name="checkmark-circle" size={18} color="#2563EB" />
                    <Pressable
                      onPress={() => { setNameInput(displayName); setSaveMsg(""); setEditing(true); }}
                      hitSlop={12}
                      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                    >
                      <Ionicons name="pencil-outline" size={15} color="#93C5FD" />
                    </Pressable>
                  </View>
                  {phone ? (
                    <Text style={{ color: "#1D4ED8", fontSize: 13, fontWeight: "500", marginBottom: 5 }}>
                      {phone}
                    </Text>
                  ) : null}
                  {memberSince && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Ionicons name="calendar-outline" size={12} color="#60A5FA" />
                      <Text style={{ color: "#3B82F6", fontSize: 12, fontWeight: "500" }}>
                        Member since {memberSince}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </LinearGradient>

          <View style={{ paddingHorizontal: 20, gap: 28, marginTop: 24 }}>

            {/* ── Stats card ── */}
            <View style={{ ...card, paddingVertical: 20, paddingHorizontal: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <StatCol
                  icon="heart"           iconColor="#3B82F6" bg="#EFF6FF"
                  value={favouriteTeams.length || "—"} label="Fav Teams"   divider
                />
                <StatCol
                  icon="trophy"          iconColor="#8B5CF6" bg="#F5F3FF"
                  value={league.short}                  label="League"     divider
                />
                <StatCol
                  icon="radio-button-on" iconColor="#16A34A" bg="#F0FDF4"
                  value={hasPredStats ? `${predStats.accuracy}%` : "—"} label="Accuracy" divider
                />
                <StatCol
                  icon="flame"           iconColor="#EA580C" bg="#FFF7ED"
                  value={hasPredStats ? predStats.total : "—"}           label="Total Picks"
                />
              </View>
            </View>

            {/* ── Prediction Record ── */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <Text style={{ color: "#111827", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 }}>
                  Prediction Record
                </Text>
                <Pressable
                  onPress={() => router.push("/(settings)/my-predictions")}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                    flexDirection: "row", alignItems: "center", gap: 3,
                    backgroundColor: "#EFF6FF", borderRadius: 20,
                    paddingHorizontal: 10, paddingVertical: 5,
                  })}
                >
                  <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>View all</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.accent} />
                </Pressable>
              </View>
              <View style={{ ...card, paddingVertical: 20, paddingHorizontal: 4 }}>
                {hasPredStats ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <StatCol icon="checkmark-circle" iconColor="#16A34A" bg="#F0FDF4" value={predStats.correct}      label="Correct"  divider />
                    <StatCol icon="close-circle"     iconColor="#DC2626" bg="#FEF2F2" value={predStats.wrong}        label="Wrong"    divider />
                    <StatCol icon="time"             iconColor="#D97706" bg="#FFFBEB" value={predStats.pending ?? 0} label="Pending"  divider />
                    <StatCol icon="bar-chart"        iconColor="#9CA3AF" bg="#F9FAFB" value={predStats.total}        label="Total" />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => router.push("/(settings)/my-predictions")}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      alignItems: "center", paddingVertical: 20, gap: 8,
                    })}
                  >
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="trophy-outline" size={26} color="#D1D5DB" />
                    </View>
                    <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center" }}>
                      No predictions yet — make your first pick!
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* ── Favourite Team ── */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <Text style={{ color: "#111827", fontSize: 18, fontWeight: "700", letterSpacing: -0.2 }}>
                  Favourite Team
                </Text>
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  hitSlop={8}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.6 : 1,
                    backgroundColor: "#EFF6FF", borderRadius: 20,
                    paddingHorizontal: 12, paddingVertical: 5,
                  })}
                >
                  <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>
                    {favouriteTeams.length > 0 ? "Edit" : "Add"}
                  </Text>
                </Pressable>
              </View>

              {favouriteTeams.length === 0 ? (
                <Pressable
                  onPress={() => setPickerOpen(true)}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    ...card,
                    flexDirection: "row", alignItems: "center",
                    padding: 20, gap: 16,
                  })}
                >
                  <View style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: "#EFF6FF",
                    borderWidth: 1.5, borderColor: "#BFDBFE", borderStyle: "dashed",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Ionicons name="add" size={24} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={{ color: "#374151", fontSize: 15, fontWeight: "600", marginBottom: 3 }}>
                      Add your favourite teams
                    </Text>
                    <Text style={{ color: "#9CA3AF", fontSize: 13 }}>
                      Get personalised predictions & news
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View style={{ ...card, overflow: "hidden" }}>
                  {favouriteTeams.map((sn, i) => (
                    <TeamRow
                      key={sn} shortName={sn}
                      last={i === favouriteTeams.length - 1}
                      onPress={() => setPickerOpen(true)}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* ── Account Settings ── */}
            <View>
              <Text style={{ color: "#111827", fontSize: 18, fontWeight: "700", letterSpacing: -0.2, marginBottom: 14 }}>
                Account Settings
              </Text>
              <View style={{ ...card, overflow: "hidden" }}>
                <SettingsRow
                  icon="notifications-outline"
                  iconColor="#F97316" iconBg="#FFF7ED"
                  label="Notifications"
                  subtitle="Manage your alerts and updates"
                  onPress={() => router.push("/(settings)/notifications")}
                />
                <SettingsRow
                  icon="shield-checkmark-outline"
                  iconColor="#2563EB" iconBg="#EFF6FF"
                  label="Privacy & Security"
                  subtitle="Manage your privacy and security"
                  onPress={() => router.push("/(settings)/privacy")}
                />
                <SettingsRow
                  icon="headset-outline"
                  iconColor="#16A34A" iconBg="#F0FDF4"
                  label="Help & Support"
                  subtitle="Get help and contact support"
                  onPress={() => router.push("/(settings)/help")}
                />
                <SettingsRow
                  icon="log-out-outline"
                  iconColor="#DC2626" iconBg="#FEF2F2"
                  label="Log Out"
                  subtitle="Sign out from your account"
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); handleLogout(); }}
                  last
                />
              </View>
            </View>

            {/* ── Footer ── */}
            <View style={{ alignItems: "center", gap: 20, paddingTop: 8 }}>
              {/* Branded version badge */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                backgroundColor: "#fff",
                borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
                borderWidth: StyleSheet.hairlineWidth, borderColor: "#E5E7EB",
                ...Platform.select({
                  ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
                  android: { elevation: 1 },
                  default: {},
                }),
              }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 11,
                  backgroundColor: colors.accent,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="flash" size={12} color="#fff" />
                </View>
                <Text style={{ color: "#6B7280", fontSize: 12, fontWeight: "600" }}>PredictX</Text>
                <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" }} />
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>v1.0.0</Text>
              </View>

              {/* Delete account — subtle, not prominent */}
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeleteAccount(); }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.5 : 1,
                  flexDirection: "row", alignItems: "center", gap: 6,
                })}
              >
                <Ionicons name="trash-outline" size={13} color="#D1D5DB" />
                <Text style={{ color: "#D1D5DB", fontSize: 12, fontWeight: "500" }}>Delete Account</Text>
              </Pressable>
            </View>

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
