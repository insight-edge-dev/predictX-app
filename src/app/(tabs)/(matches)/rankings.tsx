/**
 * Full ICC Rankings screen — T20I | ODI | Test
 * Accessible from the home screen Rankings "See all" button.
 */

import {
  View, Text, Pressable, Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { safeBack } from '@/utils/navigation';
import { useHomeRankings, type RankingTeam, type AllRankings } from '@/hooks/useHome';
import { colors, spacing, font, radius } from '@/constants/theme';
import { countryFlagUrl } from '@/utils/flags';

type FormatKey = keyof AllRankings;

const TABS: { key: FormatKey; label: string }[] = [
  { key: 't20i_men', label: 'T20I' },
  { key: 'odi_men',  label: 'ODI'  },
  { key: 'test_men', label: 'Test' },
];

// Medal accents: gold / silver / bronze
const MEDAL_COLOR = ['#F59E0B', '#6B7280', '#B45309'] as const;
const MEDAL_BG    = ['#FFFBEB', '#F8FAFC', '#FFF7ED'] as const;
const MEDAL_LABEL = ['WORLD #1', 'WORLD #2', 'WORLD #3'] as const;

function FlagImage({
  name, image, size, fallbackSize, medalIdx,
}: {
  name: string; image: string;
  size: number; fallbackSize: number;
  medalIdx?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [flagFailed,  setFlagFailed]  = useState(false);
  const accent    = medalIdx !== undefined ? MEDAL_COLOR[medalIdx] : colors.accent;
  const flagUri   = countryFlagUrl(name);

  // Priority: Cricbuzz team image → country flag CDN → initials
  const showImage = image && !imageFailed;
  const showFlag  = !showImage && flagUri && !flagFailed;

  if (showImage) {
    return (
      <Image
        source={{ uri: image }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setImageFailed(true)}
      />
    );
  }
  if (showFlag) {
    return (
      <Image
        source={{ uri: flagUri! }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFlagFailed(true)}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: medalIdx !== undefined ? `${accent}22` : colors.accentDim,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: accent, fontSize: fallbackSize, fontWeight: '700', letterSpacing: 0.5 }}>
        {(name || '?').slice(0, 3).toUpperCase()}
      </Text>
    </View>
  );
}

/** Rank #1 — full accent-blue hero card */
function GoldCard({ team }: { team: RankingTeam }) {
  return (
    <View style={{
      marginHorizontal: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: radius.xl,
      backgroundColor: colors.accent,
      padding: spacing.xl,
      overflow: 'hidden',
    }}>
      {/* Watermark rank number */}
      <Text style={{
        position: 'absolute', right: spacing.lg, top: -8,
        fontSize: 96, fontWeight: '900',
        color: 'rgba(255,255,255,0.08)',
        lineHeight: 96,
      }}>1</Text>

      <Text style={{
        color: 'rgba(255,255,255,0.65)', fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1.5,
        textTransform: 'uppercase', marginBottom: spacing.md,
      }}>
        WORLD #1
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Flag in white circle */}
        <View style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: 'rgba(255,255,255,0.18)',
          alignItems: 'center', justifyContent: 'center',
          marginRight: spacing.lg,
        }}>
          <FlagImage
            name={team.name} image={team.image}
            size={52} fallbackSize={font.sm} medalIdx={0}
          />
        </View>

        {/* Name */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: font.xxl, fontWeight: '800', letterSpacing: -0.3 }} numberOfLines={1}>
            {team.name}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: font.sm, marginTop: 2 }}>
            {team.rating} rating
          </Text>
        </View>

        {/* Points */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#fff', fontSize: font.xxl, fontWeight: '900', letterSpacing: -0.5 }}>
            {Number(team.points).toLocaleString()}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: font.xs, marginTop: 2 }}>
            points
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Ranks #2 and #3 — elevated white cards with medal accent */
function MedalCard({ team, medalIdx }: { team: RankingTeam; medalIdx: 1 | 2 }) {
  const accent = MEDAL_COLOR[medalIdx];
  const bg     = MEDAL_BG[medalIdx];
  const rank   = medalIdx + 1;

  return (
    <View style={{
      flex: 1,
      borderRadius: radius.xl,
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: `${accent}30`,
      padding: spacing.md,
      overflow: 'hidden',
    }}>
      {/* Watermark rank */}
      <Text style={{
        position: 'absolute', right: spacing.sm, top: -4,
        fontSize: 56, fontWeight: '900',
        color: `${accent}14`,
        lineHeight: 56,
      }}>{rank}</Text>

      <Text style={{
        color: accent, fontSize: font.xs, fontWeight: '700',
        letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.sm,
      }}>
        #{rank}
      </Text>

      <FlagImage
        name={team.name} image={team.image}
        size={44} fallbackSize={font.sm} medalIdx={medalIdx}
      />

      <Text style={{
        color: colors.textPrimary, fontSize: font.sm, fontWeight: '700',
        marginTop: spacing.sm, lineHeight: 18,
      }} numberOfLines={2}>
        {team.name}
      </Text>

      <Text style={{ color: accent, fontSize: font.lg, fontWeight: '900', marginTop: 4 }}>
        {Number(team.points).toLocaleString()}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: font.xs }}>pts · {team.rating} rtg</Text>
    </View>
  );
}

/** Ranks 4+ — compact clean rows */
function RankRow({ team, index }: { team: RankingTeam; index: number }) {
  const rank = team.rank || index + 1;

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    }}>
      {/* Rank */}
      <Text style={{
        width: 32,
        color: colors.textMuted,
        fontSize: font.sm,
        fontWeight: '600',
        textAlign: 'center',
      }}>
        {rank}
      </Text>

      {/* Flag */}
      <View style={{ marginRight: spacing.md }}>
        <FlagImage
          name={team.name} image={team.image}
          size={36} fallbackSize={font.xs}
        />
      </View>

      {/* Name */}
      <Text style={{
        flex: 1,
        color: colors.textPrimary,
        fontSize: font.sm,
        fontWeight: '600',
      }} numberOfLines={1}>
        {team.name}
      </Text>

      {/* Rating */}
      <View style={{ alignItems: 'flex-end', marginRight: spacing.xl }}>
        <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>
          {team.rating}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>rtg</Text>
      </View>

      {/* Points */}
      <View style={{ alignItems: 'flex-end', minWidth: 52 }}>
        <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
          {Number(team.points).toLocaleString()}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>pts</Text>
      </View>
    </View>
  );
}

export default function RankingsScreen() {
  const router   = useRouter();
  const [activeTab, setActiveTab] = useState<FormatKey>('t20i_men');
  const { data, isLoading } = useHomeRankings();

  const teams: RankingTeam[] = data?.rankings?.[activeTab] ?? [];
  const top3    = teams.slice(0, 3);
  const theRest = teams.slice(3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => safeBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.5 : 1,
            marginRight: spacing.md,
            width: 36, height: 36,
            alignItems: 'center', justifyContent: 'center',
            borderRadius: radius.md,
            backgroundColor: colors.cardElevated,
          })}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700' }}>
            ICC Rankings
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 1 }}>
            Team rankings by format
          </Text>
        </View>
      </View>

      {/* Format tabs */}
      <View style={{
        backgroundColor: colors.card,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        flexDirection: 'row',
        gap: 8,
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: active ? colors.accent : colors.cardElevated,
              }}
            >
              <Text style={{
                color: active ? '#fff' : colors.textSecondary,
                fontSize: font.sm,
                fontWeight: active ? '700' : '500',
              }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
          <ActivityIndicator color={colors.accent} />
          <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Loading rankings…</Text>
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
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {/* Top 3 hero section */}
          <View style={{ paddingTop: spacing.xl, paddingBottom: spacing.lg }}>
            {/* Rank #1 hero card */}
            {top3[0] && <GoldCard team={top3[0]} />}

            {/* Ranks #2 and #3 side by side */}
            {(top3[1] || top3[2]) && (
              <View style={{
                flexDirection: 'row',
                gap: spacing.sm,
                paddingHorizontal: spacing.lg,
              }}>
                {top3[1] && <MedalCard team={top3[1]} medalIdx={1} />}
                {top3[2] && <MedalCard team={top3[2]} medalIdx={2} />}
              </View>
            )}
          </View>

          {/* Section divider */}
          {theRest.length > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              marginBottom: spacing.sm,
              gap: spacing.md,
            }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
              <Text style={{
                color: colors.textMuted, fontSize: font.xs,
                fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase',
              }}>
                More Teams
              </Text>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            </View>
          )}

          {/* Column header for the rest */}
          {theRest.length > 0 && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}>
              <Text style={{ width: 32, color: colors.textMuted, fontSize: font.xs, fontWeight: '700', textAlign: 'center' }}>#</Text>
              <Text style={{ flex: 1, marginLeft: spacing.md + 36, color: colors.textMuted, fontSize: font.xs, fontWeight: '700' }}>TEAM</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', marginRight: spacing.xl, width: 28, textAlign: 'right' }}>RTG</Text>
              <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', minWidth: 52, textAlign: 'right' }}>PTS</Text>
            </View>
          )}

          {/* Ranks 4+ */}
          <View style={{ backgroundColor: colors.card }}>
            {theRest.map((team, i) => (
              <RankRow key={team.id || String(i + 3)} team={team} index={i + 3} />
            ))}
          </View>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
