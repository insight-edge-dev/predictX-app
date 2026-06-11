/**
 * Full ICC Rankings screen — T20I | ODI | Test | Women T20I | Women ODI
 * Accessible from the home screen Rankings "See all" button.
 */

import {
  View, Text, Pressable, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useHomeRankings, type RankingTeam, type AllRankings } from '@/hooks/useHome';
import { colors, spacing, font, radius } from '@/constants/theme';

type FormatKey = keyof AllRankings;

const TABS: { key: FormatKey; label: string }[] = [
  { key: 't20i_men',  label: 'T20I' },
  { key: 'odi_men',   label: 'ODI' },
  { key: 'test_men',  label: 'Test' },
];

function RankRow({ team, index }: { team: RankingTeam; index: number }) {
  const isTop3 = index < 3;
  return (
    <View
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        paddingHorizontal: spacing.lg,
        paddingVertical:   12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
        backgroundColor:   index % 2 === 1 ? colors.borderLight : colors.card,
      }}
    >
      {/* Rank */}
      <View style={{ width: 36, alignItems: 'center' }}>
        <Text
          style={{
            color:      isTop3 ? colors.accent : colors.textMuted,
            fontSize:   font.base,
            fontWeight: isTop3 ? '800' : '600',
          }}
        >
          {team.rank || index + 1}
        </Text>
      </View>

      {/* Team logo */}
      {team.image ? (
        <Image
          source={{ uri: team.image }}
          style={{ width: 32, height: 32, marginRight: spacing.md }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.accentDim,
            alignItems: 'center', justifyContent: 'center',
            marginRight: spacing.md,
          }}
        >
          <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700' }}>
            {(team.code || team.name || '?').slice(0, 3)}
          </Text>
        </View>
      )}

      {/* Name */}
      <Text
        style={{
          flex:       1,
          color:      colors.textPrimary,
          fontSize:   font.base,
          fontWeight: isTop3 ? '700' : '500',
        }}
        numberOfLines={1}
      >
        {team.name}
      </Text>

      {/* Rating */}
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>
          {team.rating}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Rating</Text>
      </View>

      {/* Points */}
      <View style={{ alignItems: 'flex-end', gap: 2, marginLeft: spacing.lg, minWidth: 50 }}>
        <Text style={{ color: colors.accent, fontSize: font.base, fontWeight: '700' }}>
          {team.points}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Pts</Text>
      </View>
    </View>
  );
}

export default function RankingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FormatKey>('t20i_men');
  const { data, isLoading } = useHomeRankings();

  const teams: RankingTeam[] = data?.rankings?.[activeTab] ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection:    'row',
          alignItems:       'center',
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.md,
          backgroundColor:  colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', flex: 1 }}>
          ICC Rankings
        </Text>
      </View>

      {/* Format tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 4, paddingVertical: spacing.sm }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical:   spacing.sm,
                borderRadius:      radius.md,
                backgroundColor:   active ? colors.accent : 'transparent',
              }}
            >
              <Text
                style={{
                  color:      active ? '#FFFFFF' : colors.textSecondary,
                  fontSize:   font.sm,
                  fontWeight: active ? '700' : '500',
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Table header */}
      <View
        style={{
          flexDirection:   'row',
          alignItems:      'center',
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.sm,
          backgroundColor: colors.cardElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ width: 36, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>#</Text>
        <View style={{ width: 32 + spacing.md }} />
        <Text style={{ flex: 1, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>TEAM</Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', marginRight: spacing.lg + 2 }}>RTG</Text>
        <Text style={{ width: 50, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'right' }}>PTS</Text>
      </View>

      {/* Ranking list */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.md }}>
            Loading rankings…
          </Text>
        </View>
      ) : teams.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl }}>
          <Ionicons name="trophy-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '600', marginTop: spacing.lg, textAlign: 'center' }}>
            Rankings temporarily unavailable
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 }}>
            ICC rankings will appear once the API quota resets
          </Text>
        </View>
      ) : (
        <FlashList
          data={teams}
          keyExtractor={(item, i) => item.id || String(i)}
          estimatedItemSize={58}
          renderItem={({ item, index }) => <RankRow team={item} index={index} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ backgroundColor: colors.card }}
        />
      )}
    </SafeAreaView>
  );
}
