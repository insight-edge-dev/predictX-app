import { View, Text } from 'react-native';
import { colors, spacing, font, radius } from '@/constants/theme';

interface FootballProbabilityBarProps {
  homeTeam:   string;
  awayTeam:   string;
  homeWin:    number;
  draw:       number;
  awayWin:    number;
  isKnockout?: boolean;
}

export function FootballProbabilityBar({
  homeTeam,
  awayTeam,
  homeWin,
  draw,
  awayWin,
  isKnockout = false,
}: FootballProbabilityBarProps) {
  const total = homeWin + draw + awayWin || 100;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius:    radius.md,
        padding:         spacing.lg,
        borderWidth:     1,
        borderColor:     colors.border,
      }}
    >
      {/* ── Labels row ───────────────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>
          {homeTeam} {homeWin}%
        </Text>
        {!isKnockout && draw > 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: font.sm, fontWeight: '600' }}>
            Draw {draw}%
          </Text>
        )}
        <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }} numberOfLines={1}>
          {awayWin}% {awayTeam}
        </Text>
      </View>

      {/* ── Three-section bar ─────────────────────────── */}
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 1 }}>
        {/* Home win — green */}
        <View
          style={{
            flex:            homeWin / total,
            backgroundColor: colors.success,
            borderRadius:    4,
          }}
        />

        {/* Draw — gray (hidden in knockout) */}
        {!isKnockout && draw > 0 && (
          <View
            style={{
              flex:            draw / total,
              backgroundColor: colors.border,
            }}
          />
        )}

        {/* Away win — accent red/orange */}
        <View
          style={{
            flex:            awayWin / total,
            backgroundColor: colors.danger,
            borderRadius:    4,
          }}
        />
      </View>

      {/* ── Legend ────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.success }} />
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Home Win</Text>
        </View>
        {!isKnockout && draw > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.border }} />
            <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Draw</Text>
          </View>
        )}
        {isKnockout && (
          <Text style={{ color: colors.textMuted, fontSize: font.xs, fontStyle: 'italic' }}>
            Knockout — no draw
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: colors.danger }} />
          <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Away Win</Text>
        </View>
      </View>
    </View>
  );
}
