import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing, radius } from '@/constants/theme';
import type { Comment } from '@/hooks/useComments';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';
}

const AVATAR_COLORS = [
  '#2563EB', '#7C3AED', '#DB2777', '#D97706',
  '#16A34A', '#0891B2', '#DC2626', '#9333EA',
];
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

interface Props {
  comment: Comment;
  isOwn?: boolean;
}

export function CommentItem({ comment, isOwn }: Props) {
  const color = avatarColor(comment.display_name);
  const init  = initials(comment.display_name);

  return (
    <View style={[styles.row, isOwn && styles.rowOwn]}>
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color + '18' }]}>
        <Text style={[styles.avatarText, { color }]}>{init}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, isOwn && { color: colors.accent }]} numberOfLines={1}>
            {comment.display_name}
          </Text>
          {isOwn && <Text style={styles.youBadge}>You</Text>}
          <Text style={styles.time}>{timeAgo(comment.created_at)}</Text>
        </View>
        <Text style={styles.body}>{comment.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.sm + 2,
    gap:               spacing.sm,
  },
  rowOwn: {
    // subtle accent indicator on own comments via left border on content
  },
  avatar: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
    marginTop:      1,
  },
  avatarText: {
    fontSize:   font.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
    marginBottom:  3,
  },
  name: {
    fontSize:   font.sm,
    fontWeight: '700',
    color:      colors.textPrimary,
    flexShrink: 1,
  },
  youBadge: {
    fontSize:          9,
    fontWeight:        '700',
    color:             colors.accent,
    backgroundColor:   colors.accentDim,
    paddingHorizontal: 5,
    paddingVertical:   1,
    borderRadius:      4,
    letterSpacing:     0.3,
  },
  time: {
    fontSize:   font.xs,
    color:      colors.textMuted,
    marginLeft: 'auto',
  },
  body: {
    fontSize:   font.md,
    color:      colors.textPrimary,
    lineHeight: font.md * 1.45,
  },
});
