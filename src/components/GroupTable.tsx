import { View, Text, Pressable } from 'react-native';
import { memo } from 'react';
import type { FootballGroupStanding } from '@/types/football';
import { colors, spacing, font } from '@/constants/theme';
import { TeamCrest } from './TeamCrest';

// ── Form dot ──────────────────────────────────────────────────────

function FormDot({ result }: { result: string }) {
  const bg =
    result === 'W' ? colors.success :
    result === 'L' ? colors.danger  :
    colors.border;
  return (
    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 7, fontWeight: '800' }}>{result}</Text>
    </View>
  );
}

// ── Column header ─────────────────────────────────────────────────

function ColHeader({ label, flex = 1, align = 'center' }: { label: string; flex?: number; align?: 'center' | 'flex-start' }) {
  return (
    <Text style={{ flex, color: colors.textMuted, fontSize: font.xs, fontWeight: '600', textAlign: align === 'center' ? 'center' : 'left' }}>
      {label}
    </Text>
  );
}

// ── Table row ─────────────────────────────────────────────────────

function TableRow({ standing, isLast }: { standing: FootballGroupStanding; isLast: boolean }) {
  const qualifies = standing.rank <= 2;
  const form      = (standing.form ?? '').toUpperCase().slice(-5).split('');

  return (
    <View
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        paddingVertical: spacing.sm + 1,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.borderLight,
        borderLeftWidth: qualifies ? 3 : 0,
        borderLeftColor: qualifies ? colors.success : 'transparent',
        paddingLeft:     qualifies ? spacing.sm - 3 : spacing.sm,
        paddingRight:    spacing.sm,
      }}
    >
      {/* Rank */}
      <Text style={{ width: 20, color: colors.textMuted, fontSize: font.xs, fontWeight: '600', textAlign: 'center' }}>
        {standing.rank}
      </Text>

      {/* Crest + team name */}
      <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: spacing.sm }}>
        <TeamCrest logo={standing.team.logo} flag={standing.team.flag} size={18} />
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
          {standing.team.shortName}
        </Text>
      </View>

      {/* P */}
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>
        {standing.played}
      </Text>

      {/* W */}
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>
        {standing.won}
      </Text>

      {/* D */}
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>
        {standing.drawn}
      </Text>

      {/* L */}
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: font.xs, textAlign: 'center' }}>
        {standing.lost}
      </Text>

      {/* GD */}
      <Text style={{
        flex:        1,
        color:       standing.goalDiff > 0 ? colors.success : standing.goalDiff < 0 ? colors.danger : colors.textMuted,
        fontSize:    font.xs,
        fontWeight:  '600',
        textAlign:   'center',
      }}>
        {standing.goalDiff > 0 ? `+${standing.goalDiff}` : standing.goalDiff}
      </Text>

      {/* Pts */}
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm, fontWeight: '700', textAlign: 'center' }}>
        {standing.points}
      </Text>

      {/* Form dots */}
      <View style={{ flex: 2, flexDirection: 'row', justifyContent: 'flex-end', gap: 2 }}>
        {form.map((r, i) => <FormDot key={i} result={r} />)}
      </View>
    </View>
  );
}

// ── GroupTable ────────────────────────────────────────────────────

interface GroupTableProps {
  groupName:  string;               // "Group A"
  standings:  FootballGroupStanding[];
  onPress?:   () => void;
}

export const GroupTable = memo(function GroupTable({ groupName, standings, onPress }: GroupTableProps) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    10,
        borderWidth:     1,
        borderColor:     colors.border,
        overflow:        'hidden',
        marginBottom:    spacing.md,
      }}
    >
      {/* Group header */}
      <Pressable
        onPress={onPress}
        style={{
          flexDirection:   'row',
          alignItems:      'center',
          justifyContent:  'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical:  spacing.sm + 2,
          backgroundColor: colors.cardElevated,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: font.md, fontWeight: '700' }}>
          {groupName}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
          Top 2 advance →
        </Text>
      </Pressable>

      {/* Column headers */}
      <View
        style={{
          flexDirection:    'row',
          alignItems:       'center',
          paddingVertical:  spacing.sm,
          paddingHorizontal: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Text style={{ width: 20, color: colors.textMuted, fontSize: font.xs, fontWeight: '600', textAlign: 'center' }}>#</Text>
        <ColHeader label="Team" flex={3} align="flex-start" />
        <ColHeader label="P"  />
        <ColHeader label="W"  />
        <ColHeader label="D"  />
        <ColHeader label="L"  />
        <ColHeader label="GD" />
        <ColHeader label="Pts" />
        <ColHeader label="Form" flex={2} />
      </View>

      {/* Rows */}
      {standings.map((s, i) => (
        <TableRow key={s.team.id || i} standing={s} isLast={i === standings.length - 1} />
      ))}

      {/* Legend */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight }}>
        <View style={{ width: 3, height: 12, borderRadius: 1, backgroundColor: colors.success }} />
        <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Top 2 advance · 8 best 3rd-place also qualify</Text>
      </View>
    </View>
  );
});
