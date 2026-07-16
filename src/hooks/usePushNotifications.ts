import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '@/services/api';

// expo-notifications crashes at module init time in Expo Go (SDK 53+).
// Static `import` always runs — so we lazy-require instead.
// In Expo Go the require() call is never reached → no crash.
type N = typeof import('expo-notifications');

const isExpoGo = Constants.appOwnership === 'expo';

const Notifications: N | null = isExpoGo
  ? null
  : (() => { try { return require('expo-notifications') as N; } catch { return null; } })();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert:  true,
      shouldShowBanner: true,
      shouldShowList:   true,
      shouldPlaySound:  true,
      shouldSetBadge:   false,
    }),
  });
}

export async function requestPushPermissionAndRegister(): Promise<{ success: boolean; error?: string }> {
  if (!Notifications || !Device.isDevice) return { success: false, error: 'Not supported' };

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }

  if (status !== 'granted') return { success: false, error: 'Permission denied' };

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'PredictX',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:       '#2563EB',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post('/user/push-token', { token, platform: Platform.OS });
    return { success: true };
  } catch (e: any) {
    const msg = e?.message ?? 'Unknown error';
    console.warn('[Push] token registration failed:', msg);
    return { success: false, error: msg };
  }
}

export async function getPermissionStatus(): Promise<string> {
  if (!Notifications || !Device.isDevice) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

// Retries registration silently when app comes to foreground.
// Handles cold-start backends (Render free tier) — first attempt may time out
// but subsequent foreground events retry until the backend is warm.
function useTokenRetryOnForeground() {
  const hasToken = useRef(false);

  useEffect(() => {
    if (!Notifications || !Device.isDevice) return;

    const tryRegister = async () => {
      if (hasToken.current) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const result = await requestPushPermissionAndRegister();
      if (result.success) hasToken.current = true;
    };

    // Try immediately on mount
    tryRegister();

    // Retry every time app comes to foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') tryRegister();
    });

    return () => sub.remove();
  }, []);
}

export function usePushNotifications() {
  const router      = useRouter();
  const responseRef = useRef<any>(null);

  useTokenRetryOnForeground();

  useEffect(() => {
    if (!Notifications || !Device.isDevice) return;

    responseRef.current = Notifications.addNotificationResponseReceivedListener(resp => {
      const data = resp.notification.request.content.data as Record<string, string> | undefined;
      if (data?.route) {
        router.push(data.route as any);
      } else if (data?.type === 'prediction_result' && data?.matchId) {
        router.push(`/match/${data.matchId}` as any);
      }
    });

    return () => { responseRef.current?.remove(); };
  }, []);
}
