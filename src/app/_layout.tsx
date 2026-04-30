import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,        // treat data as fresh for 60s
      gcTime: 10 * 60 * 1000,      // keep in memory 10min after unmount
      retry: 0,                    // no auto-retry — prevents 429 cascade
      refetchOnMount: false,       // don't refetch when tab switches remount
      refetchOnWindowFocus: false, // don't refetch on app foreground
      refetchOnReconnect: false,   // don't refetch on reconnect
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#07080F" },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
