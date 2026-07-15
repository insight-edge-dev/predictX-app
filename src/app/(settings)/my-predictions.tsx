import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMyPredictionHistory,
  type UserPredictionHistoryItem,
  type PredictionResult,
} from '@/hooks/useUserPrediction';
import { colors, spacing, font, radius } from '@/constants/theme';

type Tab = 'all' | 'pending' | 'finished';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'pending',  label: 'Pending' },
  { key: 'finished', label: 'Finished' },
];

function resultConfig(result: PredictionResult) {
  if (result === 'correct') return { label: 'Correct', color: colors.success, icon: 'checkmark-circle' as const };
  if (result === 'wrong')   return { label: 'Wrong',   color: colors.danger,  icon: 'close-circle'    as const };
  if (result === 'void')    return { label: 'Void',    color: colors.textMuted, icon: 'remove-circle-outline' as const };
  return                           { label: 'Pending', color: colors.warning, icon: 'time-outline'     as const };
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

// ── Prediction Card ───────────────────────────────────────────

function PredictionCard({ item }: { item: UserPredictionHistoryItem }) {
  const rc      = resultConfig(item.result);
  const picked  = item.predicted_winner === 'draw' ? 'Draw' : item.predicted_winner;
  const isFooty = item.sport === 'football';

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    }}>
      {/* Top row: teams + result badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: isFooty ? '#3B82F620' : colors.accent + '15',
          alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Ionicons
            name={isFooty ? 'football-outline' : 'trophy-outline'}
            size={16}
            color={isFooty ? '#3B82F6' : colors.accent}
          />
        </View>
        <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }} numberOfLines={1}>
          {item.team_a} vs {item.team_b}
        </Text>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 3,
          backgroundColor: rc.color + '18',
          borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
          flexShrink: 0,
        }}>
          <Ionicons name={rc.icon} size={11} color={rc.color} />
          <Text style={{ color: rc.color, fontSize: 10, fontWeight: '700' }}>{rc.label.toUpperCase()}</Text>
        </View>
      </View>

      {/* Bottom row: pick + date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
          <Ionicons name="hand-right-outline" size={12} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>
            You picked{' '}
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{picked}</Text>
          </Text>
          {item.has_changed && (
            <View style={{
              backgroundColor: colors.textMuted + '20',
              borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
            }}>
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '700' }}>CHANGED</Text>
            </View>
          )}
        </View>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, flexShrink: 0, marginLeft: spacing.sm }}>
          {fmtDate(item.created_at)}
        </Text>
      </View>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────

function SectionHeader({ icon, label, count, mt = 0 }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; count: number; mt?: number;
}) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      marginBottom: spacing.md, marginTop: mt,
    }}>
      <Ionicons name={icon} size={13} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>
        {label} · {count}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────

export default function MyPredictionsScreen() {
  const router      = useRouter();
  const qc          = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [tab, setTab]       = useState<Tab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const { data: predictions = [], isLoading, refetch } = useMyPredictionHistory(isAuthenticated);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      qc.invalidateQueries({ queryKey: ['prediction-stats', 'me'] }),
    ]);
    setRefreshing(false);
  }, [refetch, qc]);

  const stats = useMemo(() => ({
    total:    predictions.length,
    pending:  predictions.filter(p => p.result === null).length,
    finished: predictions.filter(p => p.result !== null).length,
  }), [predictions]);

  const { cricket, football } = useMemo(() => {
    const filtered = predictions.filter(p => {
      if (tab === 'pending')  return p.result === null;
      if (tab === 'finished') return p.result !== null;
      return true;
    });
    return {
      cricket:  filtered.filter(p => p.sport !== 'football'),
      football: filtered.filter(p => p.sport === 'football'),
    };
  }, [predictions, tab]);

  const isEmpty = cricket.length === 0 && football.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginRight: spacing.md }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.xl, fontWeight: '800' }}>
            My Predictions
          </Text>
          {stats.total > 0 && (
            <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
              {stats.total} total
            </Text>
          )}
        </View>

        {/* Tabs */}
        <View style={{
          flexDirection: 'row', gap: spacing.sm,
          paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
          borderBottomWidth: 1, borderBottomColor: colors.border,
        }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            const count    = t.key === 'pending' ? stats.pending : t.key === 'finished' ? stats.finished : stats.total;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 10,
                  borderRadius: radius.md,
                  backgroundColor: isActive ? colors.accent : colors.cardElevated,
                  borderWidth: 1, borderColor: isActive ? colors.accent : colors.border,
                }}
              >
                <Text style={{ color: isActive ? '#fff' : colors.textSecondary, fontSize: font.sm, fontWeight: '700' }}>
                  {t.label}
                </Text>
                {stats.total > 0 && (
                  <Text style={{ color: isActive ? 'rgba(255,255,255,0.65)' : colors.textMuted, fontSize: 10, marginTop: 1 }}>
                    {count}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : isEmpty ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: colors.cardElevated,
              borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
            }}>
              <Ionicons name="trophy-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing.sm }}>
              {tab === 'pending'  ? 'No pending predictions'  :
               tab === 'finished' ? 'No finished predictions' : 'No predictions yet'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center' }}>
              {tab === 'all' ? 'Make your first pick from the Matches or Home screen.' : ''}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.accent}
                colors={[colors.accent]}
              />
            }
          >
            {cricket.length > 0 && (
              <>
                <SectionHeader icon="trophy-outline" label="CRICKET" count={cricket.length} />
                {cricket.map(item => <PredictionCard key={item.id} item={item} />)}
              </>
            )}
            {football.length > 0 && (
              <>
                <SectionHeader
                  icon="football-outline"
                  label="FOOTBALL"
                  count={football.length}
                  mt={cricket.length > 0 ? spacing.lg : 0}
                />
                {football.map(item => <PredictionCard key={item.id} item={item} />)}
              </>
            )}
          </ScrollView>
        )}

      </SafeAreaView>
    </View>
  );
}
