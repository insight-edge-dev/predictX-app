import { router } from 'expo-router';

export function safeBack(fallback: string = '/(tabs)/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as Parameters<typeof router.replace>[0]);
  }
}
