import {
  View, Text, TextInput, Pressable, Image,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Linking, Animated,
} from 'react-native';

const PRIVACY_URL = 'https://insight-edge-dev.github.io/PredictX-Legal/privacy-policy.html';
const TERMS_URL   = 'https://insight-edge-dev.github.io/PredictX-Legal/terms-of-service.html';
import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, font, radius } from '@/constants/theme';

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  android: { elevation: 6 },
  default: {},
});

const logoShadow = Platform.select({
  ios: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  android: { elevation: 4 },
  default: {},
});

const ctaShadow = Platform.select({
  ios: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  android: { elevation: 4 },
  default: {},
});

type Mode = 'login' | 'signup';
type Step = 'phone' | 'otp';

// ── OTP Boxes ─────────────────────────────────────────────────

const OtpInput = memo(function OtpInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<TextInput>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map((i) => (
        <View key={i} style={{
          width: 44, height: 52, borderRadius: radius.md,
          borderWidth: value.length === i ? 2 : 1.5,
          borderColor: value[i] ? colors.accent : value.length === i ? colors.accent : colors.border,
          backgroundColor: value[i] ? colors.accentDim : colors.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '800' }}>
            {value[i] ?? ''}
          </Text>
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
});

// ── Phone Input ───────────────────────────────────────────────

const PhoneInput = memo(function PhoneInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={{
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.md, borderWidth: 1.5,
      borderColor: focused ? colors.accent : colors.border,
      paddingHorizontal: spacing.lg, height: 56,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        paddingRight: spacing.md, marginRight: 2,
        borderRightWidth: 1, borderRightColor: colors.border,
      }}>
        <Text style={{ fontSize: 18 }}>🇮🇳</Text>
        <Text style={{ color: colors.accent, fontSize: font.base, fontWeight: '800' }}>+91</Text>
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 10))}
        placeholder="Enter phone number"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={10}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, color: colors.textPrimary, fontSize: font.lg,
          fontWeight: '600', letterSpacing: 2, paddingLeft: spacing.md,
        }}
      />
      {value.length === 10 && (
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.successDim, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={14} color={colors.success} />
        </View>
      )}
    </Pressable>
  );
});

// ── Main Screen ───────────────────────────────────────────────

export default function AuthScreen() {
  const [mode, setMode]         = useState<Mode>('login');
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { sendOtp, verifyOtpLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cooldown === 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const tabAnim = useRef(new Animated.Value(mode === 'login' ? 0 : 1)).current;

  const switchMode = useCallback((m: Mode) => {
    setMode(m); setStep('phone'); setError(null); setOtp('');
    Animated.timing(tabAnim, {
      toValue: m === 'login' ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [tabAnim]);

  const clearError = useCallback(() => setError(null), []);

  const handleSendOtp = useCallback(async () => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setLoading(true); clearError();
    const result = await sendOtp(phone);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setOtp(''); setCooldown(30); setStep('otp');
  }, [phone, sendOtp, clearError]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); clearError();
    const result = await verifyOtpLogin(phone, otp);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.replace(result.isNewUser ? '/setup-name' : '/(tabs)/(home)');
  }, [otp, phone, verifyOtpLogin, clearError, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero ── */}
          <View style={{ alignItems: 'center', paddingBottom: spacing.xxl }}>
            <View style={{
              width: 88, height: 88, borderRadius: 22,
              backgroundColor: colors.card,
              borderWidth: 1, borderColor: colors.border,
              alignItems: 'center', justifyContent: 'center',
              marginBottom: spacing.lg,
              ...logoShadow,
            }}>
              <Image
                source={require('../../assets/icon.png')}
                style={{ width: 60, height: 60, borderRadius: 14 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 }}>
              Predict<Text style={{ color: colors.accent }}>X</Text>
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: font.base, fontWeight: '500' }}>
              Live Scores • Match Insights • Smart Predictions
            </Text>
          </View>

          {/* ── Auth Card ── */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: colors.border,
            marginHorizontal: spacing.lg,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.xxl,
            ...cardShadow,
          }}>
            {/* Mode tabs */}
            {step === 'phone' && (
              <View style={{
                flexDirection: 'row', backgroundColor: colors.bg,
                borderRadius: radius.md, padding: 4,
                marginBottom: spacing.xl,
                borderWidth: 1, borderColor: colors.border,
              }}>
                {(['login', 'signup'] as Mode[]).map((m, i) => {
                  const highlight = tabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: i === 0 ? [1, 0] : [0, 1],
                  });
                  return (
                    <Pressable
                      key={m}
                      onPress={() => switchMode(m)}
                      style={{ flex: 1, borderRadius: radius.sm, overflow: 'hidden' }}
                    >
                      <Animated.View style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        borderRadius: radius.sm,
                        backgroundColor: colors.accent,
                        opacity: highlight,
                      }} />
                      <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                        <Animated.Text style={{
                          fontSize: font.sm, fontWeight: '700',
                          color: tabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: i === 0 ? ['#FFFFFF', colors.textSecondary] : [colors.textSecondary, '#FFFFFF'],
                          }) as unknown as string,
                        }}>
                          {m === 'login' ? 'Sign In' : 'Sign Up'}
                        </Animated.Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Back in OTP step */}
            {step === 'otp' && (
              <Pressable
                onPress={() => { setStep('phone'); clearError(); setOtp(''); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg, alignSelf: 'flex-start' }}
              >
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>Back</Text>
              </Pressable>
            )}

            {/* ── Phone step ── */}
            {step === 'phone' && (
              <View style={{ gap: spacing.lg }}>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '700', letterSpacing: 1.2, marginBottom: spacing.sm }}>
                    PHONE NUMBER
                  </Text>
                  <PhoneInput value={phone} onChange={setPhone} />
                </View>

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label={loading ? '' : 'Send OTP'}
                  onPress={handleSendOtp}
                  loading={loading}
                  disabled={phone.length !== 10}
                />

                <TrustRow />

                <Text style={{ color: colors.textMuted, fontSize: font.xs, textAlign: 'center', lineHeight: 18 }}>
                  By continuing, you agree to our{' '}
                  <Text style={{ color: colors.accent }} onPress={() => Linking.openURL(TERMS_URL)}>
                    Terms of Service
                  </Text>
                  {' '}and{' '}
                  <Text style={{ color: colors.accent }} onPress={() => Linking.openURL(PRIVACY_URL)}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <View style={{ gap: spacing.xl }}>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '800' }}>
                    Verify your number
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', lineHeight: 20 }}>
                    Enter the 6-digit code sent to{'\n'}
                    <Text style={{ color: colors.accent, fontWeight: '700' }}>+91 {phone}</Text>
                  </Text>
                </View>

                <OtpInput value={otp} onChange={setOtp} />

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label={mode === 'login' ? 'Sign In' : 'Create Account'}
                  onPress={handleVerifyOtp}
                  loading={loading}
                  disabled={otp.length !== 6}
                />

                <View style={{ alignItems: 'center' }}>
                  {cooldown > 0 ? (
                    <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                      Resend code in{' '}
                      <Text style={{ color: colors.accent, fontWeight: '700' }}>{cooldown}s</Text>
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendOtp} disabled={loading}>
                      <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>
                        Resend OTP
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={{
      backgroundColor: colors.dangerDim, borderRadius: radius.md,
      paddingHorizontal: spacing.md, paddingVertical: 10,
      borderWidth: 1, borderColor: colors.danger + '25',
      flexDirection: 'row', alignItems: 'center', gap: 8,
    }}>
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text style={{ color: colors.danger, fontSize: font.sm, flex: 1, lineHeight: 18 }}>{msg}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, loading = false, disabled = false }: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  if (disabled) {
    return (
      <View style={{
        height: 56, borderRadius: radius.lg,
        backgroundColor: colors.borderLight,
        alignItems: 'center', justifyContent: 'center',
      }}>
        <Text style={{ color: colors.textMuted, fontSize: font.base, fontWeight: '600' }}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        borderRadius: radius.lg,
        opacity: pressed ? 0.9 : 1,
        ...ctaShadow,
      })}
    >
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' }}
      >
        {loading
          ? <ActivityIndicator color="#FFFFFF" />
          : <Text style={{ color: '#FFFFFF', fontSize: font.base, fontWeight: '600' }}>
              {label}
            </Text>
        }
      </LinearGradient>
    </Pressable>
  );
}

function TrustRow() {
  const items: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { icon: 'shield-checkmark-outline', label: 'Secure Authentication' },
    { icon: 'notifications-off-outline', label: 'No Spam' },
    { icon: 'flash-outline', label: 'Instant OTP' },
  ];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs }}>
      {items.map((item) => (
        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={item.icon} size={13} color={colors.success} />
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '600' }}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
