import { View, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { colors, spacing, font, radius } from '@/constants/theme';
import api from '@/services/api';
import { useLeague } from '@/contexts/LeagueContext';

interface ExpertPrediction {
  id:               string;
  match_id?:        string | null;
  match_label?:     string | null;
  predicted_winner: string;
  confidence:       'HIGH' | 'MEDIUM' | 'LOW';
  analysis:         string;
  is_published:     boolean;
  created_at:       string;
  updated_at:       string;
}

// ── Confidence config ─────────────────────────────────────────

const CONF_CFG = {
  HIGH:   { color: '#16a34a', bg: '#16a34a14', border: '#16a34a35', label: 'HIGH CONFIDENCE' },
  MEDIUM: { color: '#F59E0B', bg: '#F59E0B14', border: '#F59E0B35', label: 'MEDIUM CONFIDENCE' },
  LOW:    { color: '#94A3B8', bg: '#94A3B814', border: '#94A3B835', label: 'LOW CONFIDENCE'    },
};

function timeAgo(iso: string | null | undefined) {
  if (!iso) return 'Recently';
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d < 1)  return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d} days ago`;
}

// ── Prediction card ───────────────────────────────────────────

function PredictionCard({ item }: { item: ExpertPrediction }) {
  const cfg = CONF_CFG[item.confidence] ?? CONF_CFG.MEDIUM;

  return (
    <View style={{ marginBottom: spacing.lg }}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius:    radius.xl,
          borderWidth:     1, borderColor: colors.border,
          overflow:        'hidden',
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 1 },
          shadowOpacity:   0.05,
          shadowRadius:    4,
          elevation:       1,
        }}
      >
        {/* Top accent line — brand blue for analytics feel */}
        <View style={{ height: 2.5, backgroundColor: colors.accent }} />

        <View style={{ padding: spacing.xl }}>
          {/* Header row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: colors.accentDim,
                borderWidth: 1, borderColor: colors.accent + '30',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name="person" size={16} color={colors.accent} />
              </View>
              <View>
                <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
                  PredictX Expert
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                  {timeAgo(item.updated_at)}
                </Text>
              </View>
            </View>

            {/* Confidence badge */}
            <View style={{
              backgroundColor: cfg.bg, borderRadius: 20,
              paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: cfg.border,
            }}>
              <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }}>
                {cfg.label}
              </Text>
            </View>
          </View>

          {/* Match label */}
          {item.match_label && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colors.cardElevated, borderRadius: radius.sm,
              paddingHorizontal: spacing.md, paddingVertical: 6,
              marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border,
              alignSelf: 'flex-start',
            }}>
              <Ionicons name="shield-outline" size={11} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '600' }}>
                {item.match_label}
              </Text>
            </View>
          )}

          {/* Predicted winner */}
          <View style={{
            backgroundColor: colors.accentDim,
            borderRadius: radius.md,
            padding: spacing.lg,
            marginBottom: spacing.md,
            borderWidth: 1, borderColor: colors.accent + '25',
            alignItems: 'center',
          }}>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 0.8, marginBottom: 6 }}>
              PREDICTED WINNER
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="trophy" size={18} color={colors.warning} />
              <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', letterSpacing: -0.5 }}>
                {item.predicted_winner}
              </Text>
            </View>
          </View>

          {/* Analysis */}
          <Text style={{
            color: colors.textSecondary,
            fontSize: font.sm,
            lineHeight: 22,
          }}>
            {item.analysis}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function OurExpertScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { league } = useLeague();

  const { data: predictions = [], isLoading } = useQuery<ExpertPrediction[]>({
    queryKey:             ['expert-predictions', league.id],
    queryFn:              async () => {
      const res = await api.get<{ predictions: ExpertPrediction[] }>(`/expert-predictions?league=${league.id}`);
      return res.predictions ?? [];
    },
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
  });

  // Supabase Realtime — instantly reflect admin edits
  useEffect(() => {
    const channel = supabase
      .channel(`expert_pred_app_${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expert_predictions' },
        () => {
          // Any insert/update/delete → refetch
          queryClient.invalidateQueries({ queryKey: ['expert-predictions'] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '800' }}>
            Our Experts
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>
            Match predictions by PredictX analysts
          </Text>
        </View>
        {/* Live indicator */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: '#16a34a14', borderRadius: 20,
          paddingHorizontal: 10, paddingVertical: 4,
          borderWidth: 1, borderColor: '#16a34a30',
        }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#16a34a' }} />
          <Text style={{ color: '#16a34a', fontSize: 9, fontWeight: '800' }}>LIVE</Text>
        </View>
      </View>

      <FlashList
        data={predictions}
        keyExtractor={p => p.id}
        estimatedItemSize={220}
        renderItem={({ item }) => <PredictionCard item={item} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 24,
                backgroundColor: '#a78bfa15',
                borderWidth: 1, borderColor: '#a78bfa30',
                alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
              }}>
                <Ionicons name="person" size={36} color="#a78bfa" />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: font.xl, fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm }}>
                No predictions yet
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm, textAlign: 'center', lineHeight: 22, maxWidth: 280 }}>
                Our cricket analysts' match predictions will appear here before every game
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
