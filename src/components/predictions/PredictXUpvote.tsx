import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing, radius } from '@/constants/theme';

interface Props {
  count:         number;
  upvoted:       boolean;
  isLoading:     boolean;
  onToggle:      () => void;
  authenticated: boolean;
}

export function PredictXUpvote({ count, upvoted, isLoading, onToggle, authenticated }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        <Ionicons name="bulb-outline" size={14} color={colors.textMuted} />
        <Text style={styles.label}>Was this prediction helpful?</Text>
      </View>

      <View style={styles.right}>
        {!authenticated && (
          <Text style={styles.hint}>Sign in to upvote</Text>
        )}
        <Pressable
          style={[styles.btn, upvoted && styles.btnActive, isLoading && styles.btnLoading]}
          onPress={authenticated ? onToggle : undefined}
          disabled={isLoading || !authenticated}
        >
          <Ionicons
            name={upvoted ? 'thumbs-up' : 'thumbs-up-outline'}
            size={15}
            color={upvoted ? '#fff' : colors.textSecondary}
          />
          <Text style={[styles.countText, upvoted && styles.countTextActive]}>
            {count > 0 ? count.toLocaleString() : 'Upvote'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    backgroundColor:   colors.card,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    gap:               spacing.sm,
  },
  labelGroup: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  label: {
    fontSize:   font.sm,
    color:      colors.textSecondary,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  hint: {
    fontSize: font.xs,
    color:    colors.textMuted,
  },
  btn: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    borderRadius:      radius.lg,
    borderWidth:       1.5,
    borderColor:       colors.border,
    backgroundColor:   colors.bg,
  },
  btnActive: {
    borderColor:     colors.accent,
    backgroundColor: colors.accent,
  },
  btnLoading: {
    opacity: 0.5,
  },
  countText: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.textSecondary,
  },
  countTextActive: {
    color: '#fff',
  },
});
