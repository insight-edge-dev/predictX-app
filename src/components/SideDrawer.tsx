import {
  View, Text, Modal, Pressable, Animated, Dimensions, Platform,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLeague } from '@/contexts/LeagueContext';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';
import { getTeamColor } from '@/theme/colors';
import { colors, spacing, font, radius } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.80;

const drawerShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  android: { elevation: 16 },
  default: {},
});

const avatarShadow = Platform.select({
  ios: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  android: { elevation: 4 },
  default: {},
});

interface Props {
  visible:      boolean;
  onClose:      () => void;
  /** Opens the league picker. If a route is given, navigates there once a league is chosen. */
  onOpenLeague: (afterSelectRoute?: string) => void;
}

// Items that apply across the whole app, regardless of selected league
const GENERAL_ITEMS = [
  { label: 'Home',          icon: 'home',          route: '/(tabs)/(home)'             },
  { label: 'Notifications', icon: 'notifications', route: '/(settings)/notifications'  },
] as const;

// Items scoped to whichever league is selected via the league pill
const LEAGUE_ITEMS = [
  { label: 'Matches',     icon: 'trophy',    route: '/(tabs)/(matches)' },
  { label: 'Predictions', icon: 'analytics', route: '/(tabs)/(tips)'    },
  { label: 'Our Experts', icon: 'person',    route: '/(expert)'         },
] as const;

export function SideDrawer({ visible, onClose, onOpenLeague }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, logout } = useAuth();
  const { league } = useLeague();
  const { unreadCount } = useNotificationBadge();

  const slideAnim    = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: visible ? 0 : DRAWER_WIDTH,
        useNativeDriver: true,
        bounciness: 0,
        speed: 22,
      }),
      Animated.timing(opacityAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 150);
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const renderNavItem = (item: { label: string; icon: string; route: string }, onPress?: () => void) => (
    <Pressable
      key={item.label}
      onPress={onPress ?? (() => navigate(item.route))}
      style={({ pressed }) => ({
        opacity: pressed ? 0.75 : 1,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        paddingHorizontal: spacing.md, paddingVertical: 13,
        borderRadius: radius.md, marginBottom: 2,
        backgroundColor: pressed ? colors.accent + '10' : 'transparent',
      })}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: colors.cardElevated,
        borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Ionicons name={item.icon as any} size={17} color={colors.textSecondary} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '600' }}>
        {item.label}
      </Text>
      <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {item.label === 'Notifications' && unreadCount > 0 && (
          <View style={{
            backgroundColor: '#ef4444',
            borderRadius: 10,
            minWidth: 18, height: 18,
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: 5,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={14} color={colors.border} />
      </View>
    </Pressable>
  );

  const displayName = profile?.displayName || 'Cricket Fan';
  const initials    = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const phone       = user?.phone?.replace('+91', '') ?? '';
  const favTeams    = profile?.favoriteTeams ?? [];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: opacityAnim }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Drawer */}
      <Animated.View style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: DRAWER_WIDTH,
        transform: [{ translateX: slideAnim }],
        backgroundColor: colors.card,
        ...drawerShadow,
      }}>

        {/* ── Header ── */}
        <LinearGradient
          colors={['#3B82F6', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + spacing.xl,
            paddingHorizontal: spacing.xl,
            paddingBottom: spacing.xxl,
            borderBottomLeftRadius: radius.xxl,
            borderBottomRightRadius: radius.xxl,
            overflow: 'hidden',
          }}
        >
          {/* Decorative shapes */}
          <View pointerEvents="none" style={{
            position: 'absolute', top: -50, right: -40,
            width: 160, height: 160, borderRadius: 80,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }} />
          <View pointerEvents="none" style={{
            position: 'absolute', bottom: -60, left: -30,
            width: 130, height: 130, borderRadius: 65,
            backgroundColor: 'rgba(255,255,255,0.06)',
          }} />

          {/* Profile row */}
          <Pressable
            onPress={() => navigate('/(tabs)/(profile)')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.8 : 1,
              flexDirection: 'row', alignItems: 'center',
              gap: spacing.md, marginBottom: spacing.lg,
            })}
          >
            {/* Avatar with ring */}
            <View style={{
              width: 52, height: 52, borderRadius: 26,
              padding: 2,
              backgroundColor: 'rgba(255,255,255,0.25)',
              borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
              ...avatarShadow,
            }}>
              <View style={{
                flex: 1, borderRadius: 24,
                backgroundColor: '#fff',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ color: colors.accent, fontSize: font.lg, fontWeight: '900' }}>
                  {initials}
                </Text>
              </View>
            </View>

            {/* Name + phone */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
                {displayName}
              </Text>
              {phone ? (
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                  +91 {phone}
                </Text>
              ) : null}
            </View>

            {/* Edit profile */}
            <View style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="pencil-outline" size={13} color="#fff" />
            </View>
          </Pressable>

          {/* Favourite teams + League switcher row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {/* Fav teams */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {favTeams.length > 0 ? (
                <>
                  <Ionicons name="heart" size={10} color="#fff" />
                  {favTeams.slice(0, 3).map((t) => {
                    const c = getTeamColor(t);
                    return (
                      <View key={t} style={{
                        backgroundColor: '#fff', borderRadius: 6,
                        paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: c + '40',
                      }}>
                        <Text style={{ color: c, fontSize: 10, fontWeight: '800' }}>{t}</Text>
                      </View>
                    );
                  })}
                </>
              ) : (
                <Pressable
                  onPress={() => navigate('/(tabs)/(profile)')}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderStyle: 'dashed',
                    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
                  })}
                >
                  <Ionicons name="add-circle-outline" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' }}>
                    Add favourite teams
                  </Text>
                </Pressable>
              )}
            </View>

            {/* League pill */}
            <Pressable
              onPress={() => { onClose(); setTimeout(onOpenLeague, 200); }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                flexDirection: 'row', alignItems: 'center', gap: 4,
                backgroundColor: '#fff', borderRadius: 20,
                paddingHorizontal: 10, paddingVertical: 5,
              })}
            >
              <Text style={{ fontSize: 11 }}>{league.flag}</Text>
              <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.3 }}>
                {league.short}
              </Text>
              <Ionicons name="chevron-down" size={9} color={colors.accent} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* ── Nav items ── */}
        <View style={{ flex: 1, paddingTop: spacing.lg, paddingHorizontal: spacing.lg }}>
          <Text style={{
            color: colors.textMuted, fontSize: 10, fontWeight: '700',
            letterSpacing: 1.5, paddingHorizontal: spacing.sm, marginBottom: spacing.md,
          }}>
            GENERAL
          </Text>
          {GENERAL_ITEMS.map((item) => renderNavItem(item))}

          <Text style={{
            color: colors.textMuted, fontSize: 10, fontWeight: '700',
            letterSpacing: 1.5, paddingHorizontal: spacing.sm,
            marginTop: spacing.lg, marginBottom: spacing.md,
          }}>
            EXPLORE
          </Text>
          {LEAGUE_ITEMS.map((item) => renderNavItem(item, () => {
            onClose();
            setTimeout(() => onOpenLeague(item.route), 200);
          }))}
        </View>

        {/* ── Bottom ── */}
        <View style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: spacing.lg,
          borderTopWidth: 1, borderTopColor: colors.border + '50',
          gap: 4,
        }}>
          <Pressable
            onPress={() => navigate('/(settings)/help')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              paddingVertical: 10, borderRadius: radius.sm,
            })}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: colors.cardElevated,
              borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '500' }}>
              Help & Support
            </Text>
          </Pressable>

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              paddingVertical: 10, borderRadius: radius.sm,
            })}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 8,
              backgroundColor: '#ef444415',
              borderWidth: 1, borderColor: '#ef444430',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name="log-out-outline" size={16} color="#ef4444" />
            </View>
            <Text style={{ color: '#ef4444', fontSize: font.sm, fontWeight: '600' }}>Sign Out</Text>
          </Pressable>
        </View>

      </Animated.View>
    </Modal>
  );
}
