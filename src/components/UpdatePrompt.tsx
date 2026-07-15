import { View, Text, Modal, Pressable, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, spacing, radius } from '@/constants/theme';
import { useAppVersion } from '@/hooks/useAppVersion';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.insideedge.cricvora';

export function UpdatePrompt() {
  const { mustUpdate, shouldUpdate, updateMessage, dismiss } = useAppVersion();

  const visible = mustUpdate || shouldUpdate;
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="arrow-up-circle" size={40} color={colors.accent} />
          </View>

          <Text style={s.title}>
            {mustUpdate ? 'Update Required' : 'Update Available'}
          </Text>

          <Text style={s.body}>{updateMessage}</Text>

          <Pressable
            style={({ pressed }) => [s.btn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => Linking.openURL(PLAY_STORE_URL)}
          >
            <Text style={s.btnText}>Update Now</Text>
          </Pressable>

          {!mustUpdate && (
            <Pressable onPress={dismiss} style={s.skip}>
              <Text style={s.skipText}>Maybe Later</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: font.xl,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  body: {
    fontSize: font.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  btn: {
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  btnText: {
    fontSize: font.base,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  skip: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: font.sm,
    color: colors.textMuted,
  },
});
