/**
 * ScoreTable — renders batting and bowling tables for one innings.
 * Used in the Scorecard tab of match detail.
 */

import { View, Text, ScrollView } from 'react-native';
import { colors, font, spacing } from '@/constants/theme';
import type { Innings } from '@/services/matchService';

// ── Column configs ────────────────────────────────────────────

const BAT_COLS = [
  { key: 'name',       label: 'Batter',     flex: 1,   align: 'left'  as const },
  { key: 'runs',       label: 'R',          width: 36, align: 'center' as const },
  { key: 'balls',      label: 'B',          width: 36, align: 'center' as const },
  { key: 'fours',      label: '4s',         width: 32, align: 'center' as const },
  { key: 'sixes',      label: '6s',         width: 32, align: 'center' as const },
  { key: 'strikeRate', label: 'SR',         width: 48, align: 'center' as const },
];

const BOWL_COLS = [
  { key: 'name',    label: 'Bowler', flex: 1,   align: 'left'  as const },
  { key: 'overs',   label: 'O',     width: 36, align: 'center' as const },
  { key: 'maidens', label: 'M',     width: 32, align: 'center' as const },
  { key: 'runs',    label: 'R',     width: 36, align: 'center' as const },
  { key: 'wickets', label: 'W',     width: 32, align: 'center' as const },
  { key: 'economy', label: 'ECO',   width: 48, align: 'center' as const },
];

// ── Header row ────────────────────────────────────────────────

function HeaderRow({ cols }: { cols: typeof BAT_COLS }) {
  return (
    <View
      style={{
        flexDirection:   'row',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        marginBottom:    4,
      }}
    >
      {cols.map((col) => (
        <Text
          key={col.key}
          style={{
            flex:       col.flex,
            width:      col.flex ? undefined : col.width,
            fontSize:   font.xs,
            fontWeight: '700',
            color:      colors.textMuted,
            textAlign:  col.align,
            letterSpacing: 0.5,
          }}
        >
          {col.label}
        </Text>
      ))}
    </View>
  );
}

// ── Batting row ───────────────────────────────────────────────

function BatRow({ row, index }: { row: Innings['batsmen'][number]; index: number }) {
  const isEven = index % 2 === 0;
  return (
    <View
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        paddingVertical: 10,
        backgroundColor: isEven ? 'transparent' : colors.cardElevated + '40',
        borderRadius:    4,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
          {row.name.replace(/\s*\(c\)/i, '').replace(/\s*\(wk\)/i, '')}
          {row.isCaptain ? ' (c)' : ''}
          {row.isKeeper  ? ' †'  : ''}
        </Text>
        {!row.isNotOut && row.dismissal ? (
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 1 }} numberOfLines={1}>
            {row.dismissal}
          </Text>
        ) : null}
      </View>
      <Text style={[cell(36), row.isNotOut ? { color: colors.success } : {}]}>
        {row.runs}
      </Text>
      <Text style={cell(36)}>{row.balls}</Text>
      <Text style={cell(32)}>{row.fours}</Text>
      <Text style={cell(32)}>{row.sixes}</Text>
      <Text style={cell(48)}>{row.strikeRate.toFixed(1)}</Text>
    </View>
  );
}

// ── Bowling row ───────────────────────────────────────────────

function BowlRow({ row, index }: { row: Innings['bowlers'][number]; index: number }) {
  const isEven = index % 2 === 0;
  return (
    <View
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        paddingVertical: 10,
        backgroundColor: isEven ? 'transparent' : colors.cardElevated + '40',
        borderRadius:    4,
      }}
    >
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' }} numberOfLines={1}>
        {row.name}
      </Text>
      <Text style={cell(36)}>{row.overs}</Text>
      <Text style={cell(32)}>{row.maidens}</Text>
      <Text style={cell(36)}>{row.runs}</Text>
      <Text style={[cell(32), row.wickets > 0 ? { color: colors.accent } : {}]}>
        {row.wickets}
      </Text>
      <Text style={cell(48)}>{row.economy.toFixed(2)}</Text>
    </View>
  );
}

function cell(width: number) {
  return {
    width,
    fontSize:  font.sm,
    color:     colors.textSecondary,
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  };
}

// ── Section card ──────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    12,
        padding:         spacing.md,
        marginBottom:    spacing.md,
        borderWidth:     1,
        borderColor:     colors.border,
      }}
    >
      <Text
        style={{
          color:         colors.textSecondary,
          fontSize:      font.xs,
          fontWeight:    '700',
          letterSpacing: 1.5,
          marginBottom:  spacing.sm,
        }}
      >
        {title.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────

interface ScoreTableProps {
  innings: Innings[];
}

export function ScoreTable({ innings }: ScoreTableProps) {
  if (!innings || innings.length === 0) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <Text style={{ color: colors.textSecondary, fontSize: font.md }}>
          No scorecard available yet
        </Text>
      </View>
    );
  }

  return (
    <View>
      {innings.map((inning, idx) => (
        <View key={`${inning.inning}-${idx}`} style={{ marginBottom: spacing.xl }}>
          {/* Innings title */}
          <Text
            style={{
              color:         colors.textPrimary,
              fontSize:      font.base,
              fontWeight:    '700',
              marginBottom:  spacing.md,
              paddingLeft:   4,
            }}
          >
            {inning.inning}
          </Text>

          {/* Batting table */}
          {inning.batsmen && inning.batsmen.length > 0 && (
            <SectionCard title="Batting">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: '100%' }}>
                  <HeaderRow cols={BAT_COLS} />
                  {inning.batsmen.map((row, i) => (
                    <BatRow key={row.id || `bat-${i}`} row={row} index={i} />
                  ))}
                </View>
              </ScrollView>
            </SectionCard>
          )}

          {/* Bowling table */}
          {inning.bowlers && inning.bowlers.length > 0 && (
            <SectionCard title="Bowling">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ minWidth: '100%' }}>
                  <HeaderRow cols={BOWL_COLS} />
                  {inning.bowlers.map((row, i) => (
                    <BowlRow key={row.id || `bowl-${i}`} row={row} index={i} />
                  ))}
                </View>
              </ScrollView>
            </SectionCard>
          )}
        </View>
      ))}
    </View>
  );
}
