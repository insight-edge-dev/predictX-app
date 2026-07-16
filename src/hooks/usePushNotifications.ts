import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '@/services/api';

// Show banners while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldShowBanner: true,
    shouldShowList:   true,
    shouldPlaySound:  true,
    shouldSetBadge:   false,
  }),
});

export async function requestPushPermissionAndRegister(): Promise<void> {
  if (!Device.isDevice) return; // skip emulator / web

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }

  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:              'PredictX',
      importance:        Notifications.AndroidImportance.MAX,
      vibrationPattern:  [0, 250, 250, 250],
      lightColor:        '#2563EB',
    });
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    await api.post('/user/push-token', {
      token,
      platform: Platform.OS,
    });
  } catch (e) {
    console.warn('[Push] token registration failed:', e);
  }
}

export function usePushNotifications() {
  const router         = useRouter();
  const responseRef    = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register if permission already granted (no prompt — user may have granted before)
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        requestPushPermissionAndRegister().catch(() => {});
      }
    });

    // Handle notification taps → deep link
    responseRef.current = Notifications.addNotificationResponseReceivedListener(resp => {
      const data = resp.notification.request.content.data as Record<string, string> | undefined;
      if (data?.route) {
        router.push(data.route as any);
      } else if (data?.type === 'prediction_result' && data?.matchId) {
        router.push(`/match/${data.matchId}` as any);
      }
    });

    return () => {
      responseRef.current?.remove();
    };
  }, []);
}
