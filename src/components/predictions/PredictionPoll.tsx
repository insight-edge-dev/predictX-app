import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing, radius } from '@/constants/theme';
import type { PollData } from '@/hooks/useUserPrediction';

interface Props {
  poll:  PollData | undefined;
  teamA: string;
  teamB: string;
}

const BAR_CONFIG = [
  { key: 'teamA' as const, color: colors.accent,  label: (a: string, _b: string) => a },
  { key: 'draw'  as const, color: '#7C3AED',       label: () => 'Draw' },
  { key: 'teamB' as const, color: colors.live,     label: (_a: string, b: string) => b },
];

function PollBar({
  percent, color, label, isLeader,
}: {
  percent: number; color: string; label: string; isLeader: boolean;
}) {
  return (
    <View style={styles.barRow}>
      {/* Name + percentage on one line */}
      <View style={styles.barHeader}>
        <View style={styles.barLeft}>
          <Text style={[styles.barLabel, isLeader && { color: colors.textPrimary, fontWeight: '800' }]}>
            {label}
          </Text>
          {isLeader && (
            <View style={[styles.leadPill, { backgroundColor: color + '18' }]}>
              <Ionicons name="trending-up-outline" size={10} color={color} />
              <Text style={[styles.leadText, { color }]}>LEADING</Text>
            </View>
          )}
        </View>
        <Text style={[styles.barPercent, { color: isLeader ? color : colors.textMuted }]}>
          {percent}%
        </Text>
      </View>

      {/* Slim bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            {
              width:           `${Math.max(percent, 0)}%` as any,
              backgroundColor: isLeader ? color : color + '55',
            },
          ]}
        />
      </View>
    </View>
  );
}

export function PredictionPoll({ poll, teamA, teamB }: Props) {
  const isEmpty = !poll || poll.total === 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="people-outline" size={14} color={colors.textMuted} />
          <Text style={styles.title}>Community Pick</Text>
        </View>
        {!isEmpty && (
          <View style={styles.voteBadge}>
            <Text style={styles.voteCount}>{poll!.total}</Text>
            <Text style={styles.voteLabel}> {poll!.total === 1 ? 'vote' : 'votes'}</Text>
          </View>
        )}
      </View>

      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="bar-chart-outline" size={22} color={colors.border} />
          <Text style={styles.emptyText}>No predictions yet</Text>
        </View>
      ) : (
        <View style={styles.bars}>
          {(() => {
            const teamACount = Math.round(poll!.total * poll!.teamAPercent / 100);
            const teamBCount = Math.round(poll!.total * poll!.teamBPercent / 100);
            const drawCount  = Math.max(0, poll!.total - teamACount - teamBCount);
            const percents: Record<string, number> = {
              teamA: poll!.teamAPercent,
              draw:  poll!.drawPercent,
              teamB: poll!.teamBPercent,
            };
            const maxPct = Math.max(poll!.teamAPercent, poll!.drawPercent, poll!.teamBPercent);

            return BAR_CONFIG.map(cfg => (
              <PollBar
                key={cfg.key}
                percent={percents[cfg.key]}
                color={cfg.color}
                label={cfg.label(teamA, teamB)}
                isLeader={percents[cfg.key] === maxPct && maxPct > 0}
              />
            ));
          })()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor:  colors.card,
    borderRadius:     radius.xl,
    padding:          spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop:        spacing.md,
    borderWidth:      1,
    borderColor:      colors.border,
  },
  headerRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   spacing.md,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  title: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  voteBadge: {
    flexDirection: 'row',
    alignItems:    'baseline',
  },
  voteCount: {
    fontSize:   font.sm,
    fontWeight: '800',
    color:      colors.textPrimary,
  },
  voteLabel: {
    fontSize: font.xs,
    color:    colors.textMuted,
  },
  emptyWrap: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.sm,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    fontSize:  font.sm,
    color:     colors.textMuted,
    fontWeight: '500',
  },
  bars: {
    gap: 14,
  },
  barRow: {
    gap: 6,
  },
  barHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  barLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    flex:          1,
    marginRight:   spacing.sm,
  },
  barLabel: {
    fontSize:   font.sm,
    fontWeight: '600',
    color:      colors.textSecondary,
    flexShrink: 1,
  },
  leadPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: 6,
    paddingVertical:   2,
    borderRadius:      radius.sm,
    flexShrink:        0,
  },
  leadText: {
    fontSize:   9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  barPercent: {
    fontSize:   font.sm,
    fontWeight: '800',
    flexShrink: 0,
  },
  barTrack: {
    height:          5,
    borderRadius:    3,
    backgroundColor: colors.cardElevated,
    overflow:        'hidden',
  },
  barFill: {
    height:       5,
    borderRadius: 3,
  },
});
