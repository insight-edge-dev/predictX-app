/**
 * Global Search Screen
 * Tabs: Players | Venues
 * Players  → searches /api/players/search?q=
 * Venues   → searches locally from cached match venue names
 */

import {
  View, Text, TextInput, Pressable, FlatList,
  Image, ActivityIndicator, Keyboard,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { getLeagueMatches } from '@/services/matchService';
import { colors, spacing, font, radius } from '@/constants/theme';

// ── Types ─────────────────────────────────────────────────────

interface PlayerResult {
  id:      string;
  name:    string;
  country: string;
  role:    string;
  logo:    string;
}

interface VenueResult {
  name:    string;
  venueId: string | null;
}

type Tab = 'Players' | 'Venues';

// ── Role colors ───────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  BAT:    '#60a5fa',
  'WK-BAT': '#34d399',
  WK:     '#34d399',
  ALL:    '#f59e0b',
  BOL:    '#f87171',
};

// ── Debounce hook ─────────────────────────────────────────────

function useDebounce(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Player row ────────────────────────────────────────────────

function PlayerRow({ player, onPress }: { player: PlayerResult; onPress: () => void }) {
  const roleColor = ROLE_COLORS[player.role] ?? colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.card,
        gap: spacing.md,
      })}
    >
      {player.logo ? (
        <Image source={{ uri: player.logo }} style={{ width: 40, height: 40 }} resizeMode="contain" />
      ) : (
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: roleColor + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: roleColor, fontSize: font.base, fontWeight: '700' }}>
            {player.name.charAt(0)}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '600' }} numberOfLines={1}>
          {player.name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>
          {player.country}
        </Text>
      </View>
      <View style={{ backgroundColor: roleColor + '18', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: roleColor + '40' }}>
        <Text style={{ color: roleColor, fontSize: font.xs, fontWeight: '700' }}>{player.role}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

// ── Venue row ─────────────────────────────────────────────────

function VenueRow({ venue, onPress }: { venue: VenueResult; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor: colors.card,
        gap: spacing.md,
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentDim, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="business-outline" size={20} color={colors.accent} />
      </View>
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.base, fontWeight: '500' }} numberOfLines={2}>
        {venue.name}
      </Text>
      {venue.venueId && (
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      )}
    </Pressable>
  );
}

// ── Empty / loading states ────────────────────────────────────

function EmptyState({ query, tab }: { query: string; tab: Tab }) {
  if (!query) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl }}>
        <Ionicons
          name={tab === 'Players' ? 'person-outline' : 'location-outline'}
          size={48} color={colors.textMuted}
        />
        <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' }}>
          Search {tab === 'Players' ? 'cricket players' : 'match venues'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center' }}>
          {tab === 'Players'
            ? 'Find players by name — Kohli, Bumrah, Maxwell…'
            : 'Find venues by name — Wankhede, Eden Gardens…'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxxl }}>
      <Ionicons name="search-outline" size={48} color={colors.textMuted} />
      <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' }}>
        No results for "{query}"
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center' }}>
        Try a different name
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function SearchScreen() {
  const router      = useRouter();
  const inputRef    = useRef<TextInput>(null);
  const [query, setQuery]   = useState('');
  const [activeTab, setTab] = useState<Tab>('Players');
  const debounced   = useDebounce(query, 300);

  // Auto-focus
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // ── Player search ────────────────────────────────────────────
  const { data: playerResults = [], isFetching: playerFetching } = useQuery<PlayerResult[]>({
    queryKey:    ['search:players', debounced],
    queryFn:     async () => {
      if (!debounced.trim()) return [];
      const res = await api.get<{ players: PlayerResult[] }>(`/players/search?q=${encodeURIComponent(debounced)}`);
      return res.players ?? [];
    },
    enabled:     activeTab === 'Players',
    staleTime:   60_000,
    placeholderData: [],
  });

  // ── Venue search (from cached match data) ────────────────────
  const [venueResults, setVenueResults] = useState<VenueResult[]>([]);

  useEffect(() => {
    if (activeTab !== 'Venues') return;

    // Pull venues from cached match data
    getLeagueMatches('ipl').then(data => {
      const all = [...(data?.live ?? []), ...(data?.upcoming ?? []), ...(data?.completed ?? [])];
      const seen = new Set<string>();
      const venues: VenueResult[] = [];

      for (const m of all) {
        const venueName = (m as any).venue;
        const venueId   = (m as any).venueId;
        if (!venueName || seen.has(venueName)) continue;
        seen.add(venueName);
        venues.push({ name: venueName, venueId: venueId ?? null });
      }

      const q = debounced.toLowerCase();
      setVenueResults(q
        ? venues.filter(v => v.name.toLowerCase().includes(q))
        : venues,
      );
    }).catch(() => setVenueResults([]));
  }, [activeTab, debounced]);

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const isLoading = activeTab === 'Players' && playerFetching && !!debounced;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Search bar */}
      <View
        style={{
          flexDirection:   'row',
          alignItems:      'center',
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.sm,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        }}
      >
        <Pressable
          onPress={() => { Keyboard.dismiss(); router.back(); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View
          style={{
            flex:            1,
            flexDirection:   'row',
            alignItems:      'center',
            backgroundColor: colors.bg,
            borderRadius:    radius.md,
            borderWidth:     1,
            borderColor:     colors.border,
            paddingHorizontal: spacing.md,
            height:          40,
            gap:             spacing.sm,
          }}
        >
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={activeTab === 'Players' ? 'Search players…' : 'Search venues…'}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: font.base,
            }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={clearQuery} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection:   'row',
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {(['Players', 'Venues'] as Tab[]).map(tab => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setTab(tab)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}
            >
              <Text style={{ color: active ? colors.accent : colors.textSecondary, fontSize: font.sm, fontWeight: active ? '700' : '500' }}>
                {tab}
              </Text>
              {active && (
                <View style={{ position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2, backgroundColor: colors.accent, borderRadius: 1 }} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : activeTab === 'Players' ? (
        playerResults.length > 0 ? (
          <FlatList
            data={playerResults}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <PlayerRow
                player={item}
                onPress={() => {
                  Keyboard.dismiss();
                  router.push(`/(player)/${item.id}` as any);
                }}
              />
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState query={debounced} tab="Players" />
        )
      ) : (
        venueResults.length > 0 ? (
          <FlatList
            data={venueResults}
            keyExtractor={(item, i) => item.venueId ?? item.name ?? String(i)}
            renderItem={({ item }) => (
              <VenueRow
                venue={item}
                onPress={() => {
                  if (!item.venueId) return;
                  Keyboard.dismiss();
                  router.push(`/(venue)/${item.venueId}` as any);
                }}
              />
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <EmptyState query={debounced} tab="Venues" />
        )
      )}
    </SafeAreaView>
  );
}
