/**
 * Player profile screen — /player/[id]
 * Shows bio, career batting/bowling stats per format.
 */

import {
  View, Text, Pressable, ScrollView, Image, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { colors, spacing, font, radius } from '@/constants/theme';

interface CareerEntry {
  type:       string;
  matches:    number;
  innings:    number;
  runs?:      number;
  highScore?: string;
  average:    number;
  strikeRate?: number;
  hundreds?:  number;
  fifties?:   number;
  wickets?:   number;
  economy?:   number;
  bestFigures?: string;
}

interface PlayerData {
  id:           string;
  name:         string;
  country:      string;
  dateOfBirth:  string;
  role:         string;
  battingStyle: string;
  bowlingStyle: string;
  logo:         string;
  careerStats?: { batting: CareerEntry[]; bowling: CareerEntry[] } | null;
}

const ROLE_COLORS: Record<string, string> = {
  'BAT':    '#60a5fa',
  'WK-BAT': '#34d399',
  'WK':     '#34d399',
  'ALL':    '#f59e0b',
  'BOL':    '#f87171',
};

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md }}>
      <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>
        {value === 0 || value === '0' ? '—' : String(value)}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function FormatCard({ entry, type }: { entry: CareerEntry; type: 'batting' | 'bowling' }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1 }}>
          {entry.type}
        </Text>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <StatCell label="Mat" value={entry.matches} />
        <StatCell label="Inn" value={entry.innings} />
        {type === 'batting' ? (
          <>
            <StatCell label="Runs"  value={entry.runs ?? 0} />
            <StatCell label="Avg"   value={entry.average ? entry.average.toFixed(1) : '—'} />
            <StatCell label="SR"    value={entry.strikeRate ? entry.strikeRate.toFixed(1) : '—'} />
            <StatCell label="100s"  value={entry.hundreds ?? 0} />
            <StatCell label="50s"   value={entry.fifties  ?? 0} />
          </>
        ) : (
          <>
            <StatCell label="Wkts" value={entry.wickets ?? 0} />
            <StatCell label="Avg"  value={entry.average ? entry.average.toFixed(1) : '—'} />
            <StatCell label="Eco"  value={entry.economy ? entry.economy.toFixed(2) : '—'} />
            <StatCell label="Best" value={entry.bestFigures ?? '—'} />
          </>
        )}
      </View>
    </View>
  );
}

export default function PlayerScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const [tab, setTab] = useState<'batting' | 'bowling'>('batting');

  const { data: player, isLoading } = useQuery<PlayerData>({
    queryKey:  ['player', id],
    queryFn:   () => api.get<PlayerData>(`/players/${id}`),
    enabled:   !!id,
    staleTime: 24 * 60 * 60_000,
  });

  const roleColor  = player ? (ROLE_COLORS[player.role] ?? colors.textMuted) : colors.textMuted;
  const batEntries = player?.careerStats?.batting  ?? [];
  const bowEntries = player?.careerStats?.bowling   ?? [];
  const hasCareer  = batEntries.length > 0 || bowEntries.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', flex: 1 }}>Player Profile</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !player ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: font.base }}>Player not found</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
          {/* Hero */}
          <View style={{ backgroundColor: colors.card, padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              {player.logo ? (
                <Image source={{ uri: player.logo }} style={{ width: 72, height: 72 }} resizeMode="contain" />
              ) : (
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: roleColor + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: roleColor, fontSize: 24, fontWeight: '800' }}>{player.name.charAt(0)}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', letterSpacing: -0.3 }}>{player.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, marginTop: 2 }}>{player.country}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                  <View style={{ backgroundColor: roleColor + '18', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: roleColor + '40' }}>
                    <Text style={{ color: roleColor, fontSize: font.xs, fontWeight: '700' }}>{player.role}</Text>
                  </View>
                </View>
              </View>
            </View>

            {(player.battingStyle || player.bowlingStyle) && (
              <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
                {player.battingStyle ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, width: 80 }}>Batting</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>{player.battingStyle}</Text>
                  </View>
                ) : null}
                {player.bowlingStyle ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, width: 80 }}>Bowling</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: font.xs, flex: 1 }}>{player.bowlingStyle}</Text>
                  </View>
                ) : null}
                {player.dateOfBirth ? (
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, width: 80 }}>Born</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: font.xs }}>{player.dateOfBirth}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Career stats */}
          {hasCareer && (
            <View style={{ padding: spacing.lg }}>
              <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', marginBottom: spacing.md }}>
                Career Statistics
              </Text>

              {/* Format tabs */}
              <View style={{ flexDirection: 'row', backgroundColor: colors.cardElevated, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg }}>
                {(['batting', 'bowling'] as const).map(t => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: tab === t ? colors.accent : 'transparent' }}
                  >
                    <Text style={{ color: tab === t ? '#FFFFFF' : colors.textMuted, fontSize: font.sm, fontWeight: '600', textTransform: 'capitalize' }}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              {tab === 'batting' && batEntries.map((e, i) => (
                <FormatCard key={i} entry={e} type="batting" />
              ))}
              {tab === 'bowling' && bowEntries.length > 0 && bowEntries.map((e, i) => (
                <FormatCard key={i} entry={e} type="bowling" />
              ))}
              {tab === 'bowling' && bowEntries.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: spacing.xxxl }}>
                  <Text style={{ color: colors.textMuted, fontSize: font.sm }}>No bowling career stats available</Text>
                </View>
              )}
            </View>
          )}

          {!hasCareer && (
            <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: spacing.xl }}>
              <Ionicons name="stats-chart-outline" size={48} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' }}>
                Career stats not available
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
