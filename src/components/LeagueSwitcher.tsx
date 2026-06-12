import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLeague } from '@/contexts/LeagueContext';
import { LeagueSheet } from '@/components/LeagueSheet';
import { colors, spacing, font, radius } from '@/constants/theme';

/** Pressable chip showing the active league — tap to open the league/sport picker. */
export function LeagueSwitcher({ style }: { style?: object }) {
  const { league } = useLeague();
  const [open, setOpen] = useState(false);

  return (
    <View style={style}>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          opacity: pressed ? 0.8 : 1,
          flexDirection: 'row', alignItems: 'center', gap: 6,
          alignSelf: 'flex-start',
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: 1, borderColor: colors.border,
          paddingHorizontal: spacing.md, paddingVertical: 7,
        })}
      >
        <Text style={{ fontSize: 14 }}>{league.flag}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: font.xs, fontWeight: '700' }}>
          {league.short} {league.season}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
      </Pressable>

      <LeagueSheet visible={open} onClose={() => setOpen(false)} />
    </View>
  );
}
