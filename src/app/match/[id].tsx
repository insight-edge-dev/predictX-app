import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Deep link handler: https://api.predictxsports.com/match/:id
// Redirects to the match detail screen transparently.
export default function MatchDeepLink() {
  const { id, sport } = useLocalSearchParams<{ id: string; sport?: string }>();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const path = sport === 'football'
      ? `/(match-details)/${id}?sport=football`
      : `/(match-details)/${id}`;
    router.replace(path as any);
  }, [id, sport]);

  return null;
}
