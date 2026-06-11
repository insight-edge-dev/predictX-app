import {
  View, Text, FlatList, Pressable, Modal,
  Image, ScrollView, Linking, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '@/lib/supabase';
import { colors, spacing, font, radius } from '@/constants/theme';
import api from '@/services/api';
import { useNotificationBadge } from '@/contexts/NotificationBadgeContext';

const DISMISSED_KEY = 'dismissed_notifications';

interface AppNotification {
  id:           string;
  title:        string;
  body:         string;
  image_url?:   string | null;
  link_url?:    string | null;
  link_title?:  string | null;
  scheduled_at: string;
  created_at:   string;
}

// ── Helpers ───────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Detail Modal (centered card) ─────────────────────────────

function NotificationModal({
  item,
  onClose,
}: {
  item: AppNotification | null;
  onClose: () => void;
}) {
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item) {
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,    useNativeDriver: true, bounciness: 5, speed: 22 }),
        Animated.timing(opacityAnim, { toValue: 1,    duration: 180,         useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [item]);

  if (!item) return null;

  const close = () => {
    Animated.parallel([
      Animated.timing(scaleAnim,   { toValue: 0.88, duration: 160, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0,    duration: 160, useNativeDriver: true }),
    ]).start(onClose);
  };

  return (
    <Modal visible={!!item} transparent animationType="none" onRequestClose={close}>
      {/* Backdrop */}
      <Animated.View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.72)',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        opacity: opacityAnim,
      }}>
        <Pressable style={{ position: 'absolute', inset: 0 } as any} onPress={close} />

        <Animated.View style={{
          width: '100%',
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: 1, borderColor: colors.border,
          overflow: 'hidden',
          transform: [{ scale: scaleAnim }],
          // subtle top accent
          shadowColor: colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 12,
        }}>
          {/* Gold top bar */}
          <View style={{ height: 3, backgroundColor: colors.accent }} />

          {/* Image */}
          {item.image_url && (
            <Image
              source={{ uri: item.image_url }}
              style={{ width: '100%', height: 160 }}
              resizeMode="cover"
            />
          )}

          <View style={{ padding: spacing.xl }}>
            {/* Header row: icon + source + close */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 10,
                  backgroundColor: colors.accent + '18',
                  borderWidth: 1, borderColor: colors.accent + '35',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="megaphone-outline" size={15} color={colors.accent} />
                </View>
                <View>
                  <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>PredictX</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>{timeAgo(item.scheduled_at)}</Text>
                </View>
              </View>

              {/* Close button */}
              <Pressable
                onPress={close}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  width: 30, height: 30, borderRadius: 15,
                  backgroundColor: colors.cardElevated,
                  borderWidth: 1, borderColor: colors.border,
                  alignItems: 'center', justifyContent: 'center',
                })}
              >
                <Ionicons name="close" size={15} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.lg }} />

            {/* Title */}
            <Text style={{
              color: colors.textPrimary, fontSize: font.lg,
              fontWeight: '800', lineHeight: 26, marginBottom: spacing.sm,
            }}>
              {item.title}
            </Text>

            {/* Body */}
            <Text style={{
              color: colors.textSecondary,
              fontSize: font.sm, lineHeight: 22,
              marginBottom: item.link_url ? spacing.xl : spacing.sm,
            }}>
              {item.body}
            </Text>

            {/* Link button */}
            {item.link_url && (
              <Pressable
                onPress={() => Linking.openURL(item.link_url!)}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: colors.accent,
                  borderRadius: radius.md,
                  paddingVertical: 13,
                  justifyContent: 'center',
                })}
              >
                <Ionicons name="open-outline" size={16} color="#000" />
                <Text style={{ color: '#000', fontSize: font.sm, fontWeight: '800' }}>{item.link_title ?? 'Open Link'}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Notification card (list item) ─────────────────────────────

function NotificationCard({ item, onPress, onDismiss }: { item: AppNotification; onPress: () => void; onDismiss: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.lg,
        marginBottom: spacing.sm,
        borderWidth: 1, borderColor: colors.border,
        flexDirection: 'row', gap: spacing.md,
      }}>
        {/* Icon */}
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: colors.accent + '15',
          borderWidth: 1, borderColor: colors.accent + '30',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ionicons name="megaphone-outline" size={18} color={colors.accent} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', flex: 1, marginRight: spacing.sm }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, flexShrink: 0 }}>
              {timeAgo(item.scheduled_at)}
            </Text>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: font.xs, lineHeight: 18 }} numberOfLines={2}>
            {item.body}
          </Text>
          {/* Indicators */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 6 }}>
            {item.image_url && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="image-outline" size={10} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 9 }}>Image</Text>
              </View>
            )}
            {item.link_url && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="link-outline" size={10} color={colors.accent} />
                <Text style={{ color: colors.accent, fontSize: 9 }}>{item.link_title ?? 'Link'}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignSelf: 'center', gap: 8, alignItems: 'center' }}>
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          <Pressable
            onPress={e => { e.stopPropagation?.(); onDismiss(); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function NotificationsScreen() {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { markAllRead } = useNotificationBadge();
  const [selected,   setSelected]   = useState<AppNotification | null>(null);
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(20);

  // Load dismissed IDs from SecureStore on mount
  useEffect(() => {
    SecureStore.getItemAsync(DISMISSED_KEY)
      .then(v => { if (v) setDismissed(new Set(JSON.parse(v))); })
      .catch(() => {});
  }, []);

  const dismissNotification = useCallback((id: string) => {
    Alert.alert('Remove notification', 'Remove this notification from your view?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setDismissed(prev => {
          const next = new Set(prev);
          next.add(id);
          SecureStore.setItemAsync(DISMISSED_KEY, JSON.stringify([...next])).catch(() => {});
          return next;
        });
        if (selected?.id === id) setSelected(null);
      }},
    ]);
  }, [selected]);

  // Use a separate query key so it doesn't conflict with the badge context's ['notifications']
  const { data: allData = [], isLoading } = useQuery<AppNotification[]>({
    queryKey:             ['notifications', 'screen'],
    queryFn:              async () => {
      const res = await api.get<{ notifications: AppNotification[] }>('/notifications');
      return res.notifications ?? [];
    },
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
  });

  const allNotifications = allData.filter(n => !dismissed.has(n.id));
  const visibleNotifications = allNotifications.slice(0, visibleCount);
  const hasMore = visibleCount < allNotifications.length;

  // Mark as read once data loads
  const hasMarkedRead = useRef(false);
  useEffect(() => {
    if (allNotifications.length > 0 && !hasMarkedRead.current) {
      hasMarkedRead.current = true;
      markAllRead();
    }
  }, [allNotifications.length]);

  useEffect(() => {
    const channel = supabase
      .channel('notifications_app')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'screen'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginRight: spacing.md })}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '800' }}>Notifications</Text>
          {allNotifications.length > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>
              {allNotifications.length} message{allNotifications.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={visibleNotifications}
        keyExtractor={n => n.id}
        renderItem={({ item }) => (
          <NotificationCard
            item={item}
            onPress={() => setSelected(item)}
            onDismiss={() => dismissNotification(item.id)}
          />
        )}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasMore) setVisibleCount(c => c + 20); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={hasMore
          ? <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 16, fontSize: font.sm }}>Scroll for more…</Text>
          : null
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 }}>
              <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: colors.cardElevated, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
                <Ionicons name="notifications-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm }}>No notifications yet</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 22 }}>Updates from PredictX will appear here</Text>
            </View>
          )
        }
      />

      {/* Detail modal */}
      <NotificationModal item={selected} onClose={() => setSelected(null)} />
    </SafeAreaView>
  );
}
