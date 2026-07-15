import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing, radius } from '@/constants/theme';
import type { PredictedWinner, UserMatchPrediction, PredictionResult } from '@/hooks/useUserPrediction';

interface Props {
  teamA:        string;
  teamB:        string;
  prediction:   UserMatchPrediction | null;
  isLoading:    boolean;
  isSubmitting: boolean;
  matchEnded:   boolean;
  onSubmit:     (winner: PredictedWinner) => void;
  onChange:     (winner: PredictedWinner) => void;
}

const PICK_CONFIG: Record<PredictedWinner, { fill: string; dim: string }> = {
  teamA: { fill: colors.accent, dim: colors.accentDim },
  draw:  { fill: '#7C3AED',    dim: 'rgba(124,58,237,0.08)' },
  teamB: { fill: colors.live,  dim: colors.liveDim },
};

const RESULT_CONFIG: Record<NonNullable<PredictionResult>, { label: string; icon: string; color: string; bg: string }> = {
  correct: { label: 'Correct ✓',  icon: 'checkmark-circle', color: colors.success, bg: colors.successDim },
  wrong:   { label: 'Wrong ✗',    icon: 'close-circle',     color: colors.danger,  bg: colors.dangerDim  },
  void:    { label: 'Voided',     icon: 'remove-circle',    color: colors.textMuted, bg: colors.cardElevated },
};

function PickButton({
  label, value, selected, disabled, onPress,
}: {
  label: string;
  value: PredictedWinner;
  selected: boolean;
  disabled: boolean;
  onPress: (v: PredictedWinner) => void;
}) {
  const cfg = PICK_CONFIG[value];
  return (
    <Pressable
      style={[
        styles.pickBtn,
        selected && { backgroundColor: cfg.fill, borderColor: cfg.fill },
        !selected && !disabled && { backgroundColor: colors.bg, borderColor: colors.border },
        disabled && !selected && styles.pickBtnDisabled,
      ]}
      onPress={() => !disabled && onPress(value)}
      disabled={disabled}
    >
      {selected && (
        <View style={styles.checkDot}>
          <Ionicons name="checkmark" size={10} color={cfg.fill} />
        </View>
      )}
      <Text
        style={[styles.pickLabel, selected ? styles.pickLabelSelected : styles.pickLabelDefault]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Normalize predicted_winner — backend stores team name (e.g. "Spain") but legacy data
// may store the enum string ('teamA'/'teamB'/'draw'). Support both.
function resolveWinner(pw: string | undefined, teamA: string, teamB: string): PredictedWinner | null {
  if (!pw) return null;
  if (pw === 'draw') return 'draw';
  if (pw === 'teamA' || pw === teamA) return 'teamA';
  if (pw === 'teamB' || pw === teamB) return 'teamB';
  return null;
}

export function UserPredictionCard({
  teamA, teamB, prediction, isLoading, isSubmitting, matchEnded, onSubmit, onChange,
}: Props) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  const hasPredicted  = !!prediction;
  const canChange     = hasPredicted && !prediction!.has_changed && !matchEnded && !prediction!.result;
  const locked        = hasPredicted && (prediction!.has_changed || !!prediction!.result);
  const resultConfig  = prediction?.result ? RESULT_CONFIG[prediction.result] : null;
  const resolvedWinner = resolveWinner(prediction?.predicted_winner, teamA, teamB);

  const handlePress = (winner: PredictedWinner) => {
    if (!hasPredicted) onSubmit(winner);
    else if (canChange) onChange(winner);
  };

  const pickedLabel =
    resolvedWinner === 'teamA' ? teamA
    : resolvedWinner === 'teamB' ? teamB
    : resolvedWinner === 'draw'  ? 'Draw'
    : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <Ionicons name="trophy" size={15} color={colors.accent} />
          <Text style={styles.title}>Your Prediction</Text>
        </View>
        {canChange && (
          <View style={styles.changeBadge}>
            <Text style={styles.changeBadgeText}>1 change left</Text>
          </View>
        )}
        {locked && !resultConfig && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={10} color={colors.textMuted} />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>

      {/* Pick buttons */}
      <View style={styles.picks}>
        <PickButton
          label={teamA}
          value="teamA"
          selected={resolvedWinner === 'teamA'}
          disabled={isSubmitting || locked || (matchEnded && !hasPredicted)}
          onPress={handlePress}
        />
        <View style={styles.vsSep}>
          <Text style={styles.vsText}>vs</Text>
        </View>
        <PickButton
          label="Draw"
          value="draw"
          selected={resolvedWinner === 'draw'}
          disabled={isSubmitting || locked || (matchEnded && !hasPredicted)}
          onPress={handlePress}
        />
        <View style={styles.vsSep}>
          <Text style={styles.vsText}>vs</Text>
        </View>
        <PickButton
          label={teamB}
          value="teamB"
          selected={resolvedWinner === 'teamB'}
          disabled={isSubmitting || locked || (matchEnded && !hasPredicted)}
          onPress={handlePress}
        />
      </View>

      {isSubmitting && (
        <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: spacing.sm }} />
      )}

      {/* Status strip */}
      {resultConfig ? (
        <View style={[styles.statusStrip, { backgroundColor: resultConfig.bg }]}>
          <Ionicons name={resultConfig.icon as any} size={14} color={resultConfig.color} />
          <Text style={[styles.statusText, { color: resultConfig.color }]}>
            {resultConfig.label} — you picked {pickedLabel}
          </Text>
        </View>
      ) : hasPredicted && pickedLabel ? (
        <View style={styles.pickedStrip}>
          <Text style={styles.pickedStripText}>
            You picked <Text style={{ fontWeight: '700', color: colors.accent }}>{pickedLabel}</Text>
            {locked && <Text style={styles.lockedHint}> · locked in</Text>}
          </Text>
        </View>
      ) : matchEnded && !hasPredicted ? (
        <View style={styles.closedStrip}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.closedText}>Predictions closed</Text>
        </View>
      ) : !hasPredicted ? (
        <Text style={styles.hintText}>Tap to pick the winner</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius:    radius.xl,
    padding:         spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop:       spacing.lg,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.07,
    shadowRadius:    12,
    elevation:       2,
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
    fontSize:   font.base,
    fontWeight: '700',
    color:      colors.textPrimary,
  },
  changeBadge: {
    backgroundColor: colors.warningDim,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
  },
  changeBadgeText: {
    fontSize:   font.xs,
    fontWeight: '600',
    color:      colors.warning,
  },
  lockedBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             3,
    backgroundColor: colors.cardElevated,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      20,
  },
  lockedText: {
    fontSize:   font.xs,
    color:      colors.textMuted,
    fontWeight: '500',
  },
  picks: {
    flexDirection: 'row',
    alignItems:    'stretch',
    gap:            spacing.sm,
  },
  vsSep: {
    width:      0,
    overflow:   'hidden',
  },
  vsText: {
    fontSize:   font.xs,
    color:      'transparent',
  },
  pickBtn: {
    flex:           1,
    minHeight:      70,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical:   spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius:      radius.xl,
    borderWidth:       1.5,
    gap:               4,
  },
  pickBtnDisabled: {
    backgroundColor: colors.bg,
    borderColor:     colors.borderLight,
    opacity:         0.45,
  },
  checkDot: {
    width:          20,
    height:         20,
    borderRadius:   10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   2,
  },
  pickLabel: {
    fontSize:   font.md,
    fontWeight: '700',
    textAlign:  'center',
    lineHeight: font.md * 1.3,
  },
  pickLabelDefault: {
    color: colors.textSecondary,
  },
  pickLabelSelected: {
    color: '#FFFFFF',
  },
  statusStrip: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:             spacing.xs,
    marginTop:      spacing.md,
    paddingVertical:   spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius:      radius.md,
  },
  statusText: {
    fontSize:   font.sm,
    fontWeight: '600',
  },
  pickedStrip: {
    marginTop:    spacing.md,
    alignItems:   'center',
  },
  pickedStripText: {
    fontSize:   font.sm,
    color:      colors.textSecondary,
  },
  lockedHint: {
    color:      colors.textMuted,
    fontWeight: '400',
  },
  closedStrip: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:             spacing.xs,
    marginTop:       spacing.md,
  },
  closedText: {
    fontSize:   font.sm,
    color:      colors.textMuted,
  },
  hintText: {
    fontSize:   font.xs,
    color:      colors.textMuted,
    textAlign:  'center',
    marginTop:  spacing.sm,
  },
});
