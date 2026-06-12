import {
  View, Text, Modal, Pressable, ScrollView,
  Animated, Dimensions, Image,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLeague, type League } from '@/contexts/LeagueContext';
import { useLeaguesEndedMap } from '@/hooks/useMatches';
import { colors, spacing, font, radius } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export type SportTab = 'cricket' | 'football';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialSport?: SportTab;
  onSelect?: (league: League) => void;
}

export function LeagueSheet({ visible, onClose, initialSport, onSelect }: Props) {
  const { league: current, leagues, setLeagueId } = useLeague();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Default active tab to whichever sport the current league belongs to
  const [sportTab, setSportTab] = useState<SportTab>(
    current.sport === 'football' ? 'football' : 'cricket'
  );

  // Keep tab in sync if the sheet reopens with a different active league
  useEffect(() => {
    if (visible) {
      setSportTab(initialSport ?? (current.sport === 'football' ? 'football' : 'cricket'));
    }
  }, [visible, current.sport, initialSport]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue:         visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      bounciness:      4,
      speed:           20,
    }).start();
  }, [visible]);

  const handleSelect = (l: League) => {
    setLeagueId(l.id);
    onClose();
    onSelect?.(l);
  };

  const handleSelectInternational = () => {
    onClose();
    router.push('/(international)');
  };

  // Only show 2026-season leagues — the dynamic /leagues feed includes many
  // older/off-season tournaments (2025, 2025/26, 2018, etc.) that clutter the picker.
  const is2026 = (l: League) => l.season === '2026';

  const cricketLeagues  = leagues.filter(l => (l.sport === 'cricket' || !l.sport) && is2026(l));
  const footballLeagues = leagues.filter(l => l.sport === 'football' && is2026(l));
  const visibleLeagues  = sportTab === 'football' ? footballLeagues : cricketLeagues;

  // Mark leagues whose season has already finished (completed matches, none upcoming/live)
  const endedMap = useLeaguesEndedMap(cricketLeagues.map(l => l.id));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}
        onPress={onClose}
      />

      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        transform: [{ translateY: slideAnim }],
        backgroundColor: colors.card,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderWidth: 1, borderColor: colors.border,
        maxHeight: SCREEN_HEIGHT * 0.82,
      }}>
        {/* Handle */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        {/* Header row */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md,
        }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '800' }}>
            Select League
          </Text>
          <Pressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Sport tab bar */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: spacing.xl,
          marginBottom: spacing.lg,
          backgroundColor: colors.cardElevated,
          borderRadius: radius.lg,
          padding: 3,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <SportTabButton
            label="🏏  Cricket"
            active={sportTab === 'cricket'}
            count={cricketLeagues.length}
            onPress={() => setSportTab('cricket')}
          />
          <SportTabButton
            label="⚽  Football"
            active={sportTab === 'football'}
            count={footballLeagues.length}
            onPress={() => setSportTab('football')}
          />
        </View>

        {/* League list */}
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {visibleLeagues.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 32, marginBottom: spacing.md }}>
                {sportTab === 'football' ? '⚽' : '🏏'}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                No {sportTab} leagues available
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {sportTab === 'cricket' && (
                <InternationalRow onPress={handleSelectInternational} />
              )}
              {visibleLeagues.map(l => (
                <LeagueRow
                  key={String(l.leagueId ?? l.id)}
                  league={l}
                  selected={current.id === l.id}
                  ended={!!endedMap[l.id]}
                  onPress={() => handleSelect(l)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Sport tab button ──────────────────────────────────────────────

function SportTabButton({
  label, active, count, onPress,
}: {
  label: string; active: boolean; count: number; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: radius.md,
        backgroundColor: active ? colors.card : 'transparent',
        opacity: pressed ? 0.85 : 1,
        // Subtle shadow on active tab
        shadowColor: active ? '#000' : 'transparent',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: active ? 0.06 : 0,
        shadowRadius: 2,
        elevation: active ? 2 : 0,
        borderWidth: active ? 1 : 0,
        borderColor: active ? colors.border : 'transparent',
      })}
    >
      <Text style={{
        color:      active ? colors.textPrimary : colors.textMuted,
        fontSize:   font.sm,
        fontWeight: active ? '700' : '500',
      }}>
        {label}
      </Text>
      <View style={{
        backgroundColor: active ? colors.accent + '20' : colors.cardElevated,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
      }}>
        <Text style={{
          color:      active ? colors.accent : colors.textMuted,
          fontSize:   10,
          fontWeight: '700',
        }}>
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// ── International row (bilateral series, outside the league model) ───

function InternationalRow({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: colors.card,
        borderRadius: radius.md, padding: spacing.md,
        borderWidth: 1, borderStyle: 'dashed',
        borderColor: colors.accent + '50',
      })}
    >
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.accent + '20',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 22 }}>🌍</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
          International
        </Text>
        <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '600', marginTop: 2 }}>
          Bilateral T20I & ODI series · World
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

// ── League row ────────────────────────────────────────────────────

function LeagueRow({
  league, selected, ended, onPress,
}: {
  league: League; selected: boolean; ended?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
        flexDirection: 'row', alignItems: 'center', gap: spacing.md,
        backgroundColor: selected ? colors.accent + '15' : colors.card,
        borderRadius: radius.md, padding: spacing.md,
        borderWidth: 1,
        borderColor: selected ? colors.accent + '50' : colors.border,
      })}
    >
      {/* Badge */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: selected ? colors.accent + '20' : colors.cardElevated,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {league.image
          ? <Image source={{ uri: league.image }} style={{ width: 36, height: 36 }} resizeMode="contain" />
          : <Text style={{ fontSize: 22 }}>{league.flag}</Text>
        }
      </View>

      {/* Name + meta */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>
            {league.name}
          </Text>
          {ended && (
            <View style={{
              backgroundColor: colors.textMuted + '18', borderRadius: 8,
              paddingHorizontal: 6, paddingVertical: 1,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 }}>
                ENDED
              </Text>
            </View>
          )}
        </View>
        <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '600', marginTop: 2 }}>
          {league.country} · {league.season}
        </Text>
      </View>

      {selected
        ? <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
        : <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      }
    </Pressable>
  );
}
