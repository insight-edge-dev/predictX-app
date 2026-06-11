/**
 * International series list — /(international)
 *
 * Browsing entry point for bilateral T20I tours (e.g. "India tour of England",
 * "Afghanistan v Sri Lanka in UAE"). Cards are sorted live → upcoming →
 * completed by the backend.
 */

import { View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeriesCard } from '@/components/SeriesCard';
import { useInternationalSeries } from '@/hooks/useInternational';
import { colors, spacing, font } from '@/constants/theme';
import type { InternationalSeries } from '@/types/international';

export default function InternationalScreen() {
  const router = useRouter();
  const { data: series, isLoading, isRefetching, refetch } = useInternationalSeries();

  const list = series ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>International Cricket</Text>
          <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>Bilateral series around the world</Text>
        </View>
      </View>

      {isLoading && list.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : list.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xxl }}>
          <Ionicons name="globe-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '700', marginTop: spacing.lg, textAlign: 'center' }}>
            No international series available right now
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.xs, textAlign: 'center' }}>
            Check back when a new bilateral tour is scheduled
          </Text>
        </View>
      ) : (
        <FlashList<InternationalSeries>
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SeriesCard series={item} onPress={(id) => router.push(`/(international)/${id}` as any)} />
          )}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
