import {
  View, Text, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, font, radius } from '@/constants/theme';

export default function SetupNameScreen() {
  const { completeSignup } = useAuth();
  const router = useRouter();

  const [name,    setName]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleContinue = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter your name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }
    if (trimmed.length > 40) { setError('Name is too long'); return; }

    setLoading(true);
    setError('');
    const result = await completeSignup(trimmed);
    setLoading(false);

    if (!result.success) { setError(result.error ?? 'Failed to save. Try again.'); return; }
    router.replace('/(tabs)/(home)');
  }, [name, completeSignup, router]);

  const skip = useCallback(() => {
    router.replace('/(tabs)/(home)');
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={{ flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center' }}>

            {/* Icon */}
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: colors.accent + '15',
                borderWidth: 2, borderColor: colors.accent + '30',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 36 }}>🏏</Text>
              </View>
            </View>

            {/* Heading */}
            <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', textAlign: 'center', marginBottom: 8 }}>
              What's your name?
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: font.base, textAlign: 'center', marginBottom: 40, lineHeight: 22 }}>
              Let the cricket community know who you are.
            </Text>

            {/* Input */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: colors.cardElevated,
              borderRadius: radius.lg, borderWidth: 1.5,
              borderColor: name.length > 0 ? colors.accent + '60' : colors.border,
              paddingHorizontal: spacing.lg, marginBottom: 12,
            }}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                value={name}
                onChangeText={(t) => { setName(t); setError(''); }}
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
                autoFocus
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                style={{
                  flex: 1, paddingVertical: 16,
                  color: colors.textPrimary, fontSize: font.base, fontWeight: '600',
                }}
              />
            </View>

            {error ? (
              <Text style={{ color: colors.danger, fontSize: font.sm, marginBottom: 16, paddingHorizontal: 4 }}>
                {error}
              </Text>
            ) : null}

            {/* Continue button */}
            <Pressable
              onPress={handleContinue}
              disabled={loading}
              style={({ pressed }) => ({
                backgroundColor: loading ? colors.cardElevated : colors.accent,
                borderRadius: radius.lg, paddingVertical: 16,
                alignItems: 'center', opacity: pressed ? 0.85 : 1,
                marginTop: 8,
              })}
            >
              {loading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={{ color: colors.bg, fontSize: font.base, fontWeight: '900' }}>Continue</Text>
              }
            </Pressable>

            {/* Skip */}
            <Pressable onPress={skip} style={{ alignItems: 'center', paddingVertical: 16 }}>
              <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Skip for now</Text>
            </Pressable>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
