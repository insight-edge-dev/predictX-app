import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { useFonts, BarlowCondensed_700Bold } from "@expo-google-fonts/barlow-condensed";
import { Geist_800ExtraBold } from "@expo-google-fonts/geist";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { AuthProvider } from "@/contexts/AuthContext";
import { LeagueProvider } from "@/contexts/LeagueContext";
import { NotificationBadgeProvider } from "@/contexts/NotificationBadgeContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import MaintenanceBanner from "@/components/MaintenanceBanner";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { colors } from "@/constants/theme";
import { recordError } from "@/utils/firebase";
import { preloadInterstitial } from "@/utils/adInterstitial";
// Catch unhandled JS errors and send to Crashlytics (global.ErrorUtils, not a named RN export)
try {
  const EU = (global as any).ErrorUtils;
  if (EU) {
    const previousHandler = EU.getGlobalHandler();
    EU.setGlobalHandler((error: Error, isFatal?: boolean) => {
      recordError(error, isFatal ? 'fatal' : 'unhandled');
      previousHandler?.(error, isFatal);
    });
  }
} catch {}

// Initialize AdMob once at app start — silently skipped in Expo Go (native module unavailable).
try {
  const MobileAds = require('react-native-google-mobile-ads').default;
  MobileAds().initialize().then(() => preloadInterstitial()).catch(() => {});
} catch {}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

const CACHE_KEY = "PREDICTX_QUERY_CACHE";
let _throttleTimer: ReturnType<typeof setTimeout> | null = null;
let _pending: string | null = null;

const persister = {
  persistClient: async (client: unknown) => {
    try {
      _pending = JSON.stringify(client);
      if (_throttleTimer) return;
      _throttleTimer = setTimeout(async () => {
        _throttleTimer = null;
        if (_pending) {
          await AsyncStorage.setItem(CACHE_KEY, _pending).catch(() => {});
          _pending = null;
        }
      }, 3000);
    } catch {}
  },
  restoreClient: async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  },
  removeClient: () => AsyncStorage.removeItem(CACHE_KEY).catch(() => {}),
};

const CACHE_BUSTER = Constants.expoConfig?.version ?? "1.0.0";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ BarlowCondensed_700Bold, Geist_800ExtraBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: '#F8F9FB' }} />;

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 24 * 60 * 60 * 1000,
          buster: CACHE_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: (q) => {
              const key = String(q.queryKey[0] ?? '');
              return !['user', 'auth', 'profile', 'token'].some(k => key.includes(k));
            },
          },
        }}
      >
        <LeagueProvider>
        <NotificationBadgeProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
              }}
            />
            <OfflineBanner />
            <MaintenanceBanner />
            <UpdatePrompt />
          </View>
        </AuthProvider>
        </NotificationBadgeProvider>
        </LeagueProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
}
