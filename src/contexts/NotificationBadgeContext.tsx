import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import api from '@/services/api';

const STORAGE_KEY = 'notif_last_seen_at';

interface AppNotification {
  id:           string;
  scheduled_at: string;
}

interface NotificationBadgeContextValue {
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationBadgeContext = createContext<NotificationBadgeContextValue>({
  unreadCount: 0,
  markAllRead: () => {},
});

export function NotificationBadgeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // null = still loading from storage, '' = loaded but nothing stored (first install)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then(val => setLastSeenAt(val ?? ''))
      .catch(() => setLastSeenAt(''));
  }, []);

  const { data: notifications = [] } = useQuery<AppNotification[]>({
    queryKey:             ['notifications'],
    queryFn:              async () => {
      const res = await api.get<{ notifications: AppNotification[] }>('/notifications');
      return res.notifications ?? [];
    },
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
    refetchInterval:      15_000, // poll every 15s as Realtime fallback
  });

  // Realtime: invalidate when admin adds/removes notifications
  useEffect(() => {
    const channel = supabase
      .channel('notif_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const unreadCount = (() => {
    if (lastSeenAt === null) return 0;                     // still loading storage
    if (lastSeenAt === '') return notifications.length;    // first install — all are new
    return notifications.filter(n => new Date(n.scheduled_at) > new Date(lastSeenAt)).length;
  })();

  const markAllRead = useCallback(() => {
    // Save the scheduled_at of the newest notification seen, not wall-clock now.
    // This way a future-scheduled notification still shows as unread after re-entry.
    const newest = notifications.reduce<string>((max, n) =>
      new Date(n.scheduled_at) > new Date(max) ? n.scheduled_at : max,
      new Date(0).toISOString(),
    );
    setLastSeenAt(newest);
    SecureStore.setItemAsync(STORAGE_KEY, newest).catch(() => {});
  }, [notifications]);

  return (
    <NotificationBadgeContext.Provider value={{ unreadCount, markAllRead }}>
      {children}
    </NotificationBadgeContext.Provider>
  );
}

export function useNotificationBadge() {
  return useContext(NotificationBadgeContext);
}
