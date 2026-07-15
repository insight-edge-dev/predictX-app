import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useState, useRef, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useComments } from '@/hooks/useComments';
import { CommentItem } from './CommentItem';
import { colors, font, spacing, radius } from '@/constants/theme';
import api from '@/services/api';

const MAX_CHARS = 280;

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
  contextType: 'match' | 'tip';
  contextId:   string;
  userId:      string | null;
  displayName: string | null;
  hideInput?:  boolean;
}

// ── Standalone bottom input bar (Instagram-style) ─────────────────────────
// Place outside the ScrollView, inside a KeyboardAvoidingView.

export function CommentInputBar({
  contextType,
  contextId,
  userId,
  displayName,
}: Omit<Props, 'hideInput'>) {
  const [draft, setDraft]         = useState('');
  const [isSending, setIsSending] = useState(false);

  const charsLeft = MAX_CHARS - draft.length;
  const overLimit = charsLeft < 0;
  const canSend   = !!userId && draft.trim().length > 0 && !overLimit && !isSending;

  const userColor = displayName ? avatarColor(displayName) : colors.textMuted;
  const userInit  = displayName ? initials(displayName) : '?';

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || !userId) return;
    setIsSending(true);
    setDraft('');
    try {
      await api.post('/comments', {
        contextType,
        contextId,
        content:     trimmed,
        displayName: displayName ?? 'User',
      });
    } catch {
      // new comment will appear via realtime subscription in CommentSection
    } finally {
      setIsSending(false);
    }
  }, [draft, isSending, userId, displayName, contextType, contextId]);

  return (
    <View style={barStyles.container}>
      {userId ? (
        <>
          <View style={barStyles.row}>
            <View style={[barStyles.avatar, { backgroundColor: userColor + '18' }]}>
              <Text style={[barStyles.avatarText, { color: userColor }]}>{userInit}</Text>
            </View>
            <View style={[barStyles.pill, overLimit && barStyles.pillError]}>
              <TextInput
                style={barStyles.input}
                placeholder="Add a comment…"
                placeholderTextColor={colors.textMuted}
                value={draft}
                onChangeText={setDraft}
                maxLength={MAX_CHARS + 10}
                multiline
                returnKeyType="default"
                blurOnSubmit={false}
              />
            </View>
            {canSend || draft.length > 0 ? (
              <Pressable
                style={[barStyles.sendBtn, !canSend && barStyles.sendBtnOff]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {isSending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={15} color="#fff" />
                }
              </Pressable>
            ) : null}
          </View>
          {draft.length > 0 && (
            <Text style={[barStyles.chars, overLimit && barStyles.charsError]}>
              {charsLeft} chars left
            </Text>
          )}
        </>
      ) : (
        <View style={barStyles.loginRow}>
          <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} />
          <Text style={barStyles.loginText}>Sign in to comment</Text>
        </View>
      )}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    backgroundColor:   colors.card,
    borderTopWidth:    1,
    borderTopColor:    colors.border,
    paddingHorizontal: spacing.md,
    paddingTop:        spacing.sm,
    paddingBottom:     Platform.OS === 'ios' ? spacing.lg : spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.sm,
  },
  avatar: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  avatarText: {
    fontSize:      font.xs,
    fontWeight:    '800',
    letterSpacing: 0.5,
  },
  pill: {
    flex:              1,
    backgroundColor:   colors.cardElevated,
    borderRadius:      radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    minHeight:         36,
    maxHeight:         100,
    justifyContent:    'center',
  },
  pillError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  input: {
    fontSize: font.md,
    color:    colors.textPrimary,
    padding:  0,
    margin:   0,
  },
  sendBtn: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  sendBtnOff: {
    backgroundColor: colors.cardElevated,
  },
  chars: {
    fontSize:   font.xs,
    color:      colors.textMuted,
    marginTop:  4,
    marginLeft: 32 + spacing.sm,
  },
  charsError: {
    color: colors.danger,
  },
  loginRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.xs,
    paddingVertical: spacing.sm,
  },
  loginText: {
    fontSize: font.sm,
    color:    colors.textMuted,
  },
});

// ── Main CommentSection card (comment list + optional inline input) ────────

export function CommentSection({ contextType, contextId, userId, displayName, hideInput }: Props) {
  const { comments, isLoading, isSending, error, sendComment, loadMore, hasMore } = useComments(
    contextType,
    contextId,
  );

  const [draft, setDraft] = useState('');
  const flatRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending || !userId) return;
    setDraft('');
    try {
      await sendComment(trimmed, displayName ?? 'User');
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 300);
    } catch {
      // error surfaced via hook
    }
  }, [draft, isSending, userId, displayName, sendComment]);

  const charsLeft = MAX_CHARS - draft.length;
  const overLimit = charsLeft < 0;
  const canSend   = !!userId && draft.trim().length > 0 && !overLimit && !isSending;

  const renderItem = useCallback(
    ({ item }: { item: ReturnType<typeof useComments>['comments'][0] }) => (
      <CommentItem comment={item} isOwn={item.user_id === userId} />
    ),
    [userId],
  );

  const renderHeader = useCallback(() => (
    hasMore ? (
      <Pressable style={styles.loadMore} onPress={loadMore}>
        <Text style={styles.loadMoreText}>Load earlier comments</Text>
      </Pressable>
    ) : null
  ), [hasMore, loadMore]);

  const userColor = displayName ? avatarColor(displayName) : colors.textMuted;
  const userInit  = displayName ? initials(displayName) : '?';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textMuted} />
          <Text style={styles.title}>Comments</Text>
          {comments.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{comments.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Comment list */}
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.accent}
          style={{ marginVertical: spacing.xxl }}
        />
      ) : (
        <FlatList
          ref={flatRef}
          data={comments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-outline" size={16} color={colors.border} />
              <Text style={styles.emptyText}>No comments yet — be the first</Text>
            </View>
          }
          scrollEnabled={false}
          removeClippedSubviews={false}
          contentContainerStyle={{ paddingVertical: spacing.xs }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Input area */}
      {!hideInput && <View style={styles.inputArea}>
        {userId ? (
          <>
            <View style={styles.inputRow}>
              {/* User avatar */}
              <View style={[styles.selfAvatar, { backgroundColor: userColor + '18' }]}>
                <Text style={[styles.selfAvatarText, { color: userColor }]}>{userInit}</Text>
              </View>

              {/* Input pill */}
              <View style={[styles.inputPill, overLimit && styles.inputPillError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Add a comment…"
                  placeholderTextColor={colors.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  maxLength={MAX_CHARS + 10}
                  multiline
                  returnKeyType="default"
                  blurOnSubmit={false}
                />
              </View>

              {/* Send button */}
              <Pressable
                style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!canSend}
              >
                {isSending
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="send" size={15} color="#fff" />
                }
              </Pressable>
            </View>

            {/* Char counter — only visible when draft is non-empty */}
            {draft.length > 0 && (
              <Text style={[styles.charCount, overLimit && styles.charCountError]}>
                {charsLeft} characters remaining
              </Text>
            )}
          </>
        ) : (
          <View style={styles.loginPromptWrap}>
            <Ionicons name="person-circle-outline" size={20} color={colors.textMuted} />
            <Text style={styles.loginPrompt}>Sign in to leave a comment</Text>
          </View>
        )}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor:  colors.card,
    borderRadius:     radius.xl,
    marginHorizontal: spacing.lg,
    marginTop:        spacing.md,
    marginBottom:     spacing.xxl,
    borderWidth:      1,
    borderColor:      colors.border,
    overflow:         'hidden',
  },
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop:        spacing.md,
    paddingBottom:     spacing.sm,
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
  countBadge: {
    backgroundColor:   colors.cardElevated,
    paddingHorizontal: 7,
    paddingVertical:   2,
    borderRadius:      10,
    minWidth:          22,
    alignItems:        'center',
  },
  countText: {
    fontSize:   font.xs,
    fontWeight: '700',
    color:      colors.textSecondary,
  },
  divider: {
    height:           1,
    backgroundColor:  colors.borderLight,
    marginHorizontal: spacing.lg,
  },
  loadMore: {
    alignItems:      'center',
    paddingVertical: spacing.sm,
  },
  loadMoreText: {
    fontSize:   font.sm,
    color:      colors.accent,
    fontWeight: '600',
  },
  emptyWrap: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical:  spacing.lg,
  },
  emptyText: {
    fontSize:   font.sm,
    fontWeight: '500',
    color:      colors.textMuted,
  },
  emptyHint: {
    fontSize: font.sm,
    color:    colors.textMuted,
  },
  separator: {
    height:          1,
    backgroundColor: colors.borderLight,
    marginLeft:      spacing.lg + 36 + spacing.sm,
  },
  errorText: {
    fontSize:          font.sm,
    color:             colors.danger,
    paddingHorizontal: spacing.lg,
    paddingBottom:     spacing.sm,
  },
  inputArea: {
    borderTopWidth:    1,
    borderTopColor:    colors.borderLight,
    paddingTop:        spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom:     spacing.md,
    backgroundColor:   colors.card,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap:           spacing.sm,
  },
  selfAvatar: {
    width:          32,
    height:         32,
    borderRadius:   16,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  selfAvatarText: {
    fontSize:      font.xs,
    fontWeight:    '800',
    letterSpacing: 0.5,
  },
  inputPill: {
    flex:              1,
    backgroundColor:   colors.cardElevated,
    borderRadius:      radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    minHeight:         36,
    maxHeight:         100,
    justifyContent:    'center',
  },
  inputPillError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  input: {
    fontSize: font.md,
    color:    colors.textPrimary,
    padding:  0,
    margin:   0,
  },
  sendBtn: {
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: colors.accent,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  sendBtnDisabled: {
    backgroundColor: colors.cardElevated,
  },
  charCount: {
    fontSize:   font.xs,
    color:      colors.textMuted,
    marginTop:  4,
    marginLeft: 32 + spacing.sm,
  },
  charCountError: {
    color: colors.danger,
  },
  loginPromptWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             spacing.xs,
    paddingVertical: spacing.md,
  },
  loginPrompt: {
    fontSize: font.sm,
    color:    colors.textMuted,
  },
});
