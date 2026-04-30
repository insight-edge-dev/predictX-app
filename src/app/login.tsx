import {
  View, Text, TextInput, Pressable, Image,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { memo, useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, font, radius } from '@/constants/theme';

type Step = 'phone' | 'method' | 'password' | 'otp';

// ── OTP boxes ─────────────────────────────────────────────────

const OtpInput = memo(function OtpInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{
          width: 46, height: 54, borderRadius: 12,
          borderWidth: 1.5,
          borderColor: value[i] ? colors.accent : (value.length === i ? colors.accent + '80' : colors.border),
          backgroundColor: value[i] ? colors.accent + '12' : colors.card,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>
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

// ── Phone input ───────────────────────────────────────────────

const PhoneInput = memo(function PhoneInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={{
      flexDirection: 'row', alignItems: 'center',
      borderRadius: radius.md, borderWidth: 1.5,
      borderColor: focused ? colors.accent : colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.lg, height: 56,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
        <Text style={{ color: colors.accent, fontSize: font.base, fontWeight: '700' }}>+91</Text>
      </View>
      <View style={{ width: 1, height: 20, backgroundColor: colors.border, marginRight: 12 }} />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 10))}
        placeholder="10-digit number"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={10}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, color: '#fff',
          fontSize: font.lg, fontWeight: '600', letterSpacing: 2,
        }}
      />
      {value.length === 10 && (
        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
      )}
    </Pressable>
  );
});

// ── Password input ────────────────────────────────────────────

const PasswordInput = memo(function PasswordInput({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const ref = useRef<TextInput>(null);

  const toggleShow = useCallback(() => setShow((s) => !s), []);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={{
      flexDirection: 'row', alignItems: 'center',
      borderRadius: radius.md, borderWidth: 1.5,
      borderColor: focused ? colors.accent : colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.lg, height: 56,
    }}>
      <Ionicons
        name="lock-closed-outline" size={18}
        color={focused ? colors.accent : colors.textMuted}
        style={{ marginRight: 12 }}
      />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        placeholder="Enter password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry={!show}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, color: '#fff', fontSize: font.base }}
      />
      <Pressable onPress={toggleShow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
});

// ── Shared sub-components ─────────────────────────────────────

function ErrorBox({ msg }: { msg: string }) {
  return (
    <View style={{
      backgroundColor: '#ef444415', borderRadius: radius.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderWidth: 1, borderColor: '#ef444430',
      flexDirection: 'row', alignItems: 'center', gap: 8,
    }}>
      <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
      <Text style={{ color: '#ef4444', fontSize: font.sm, flex: 1 }}>{msg}</Text>
    </View>
  );
}

function PrimaryButton({
  label, onPress, loading = false, disabled = false,
}: {
  label: string; onPress: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => ({
        opacity: pressed || disabled ? 0.65 : 1,
        height: 54, borderRadius: radius.md,
        backgroundColor: disabled ? colors.border : colors.accent,
        alignItems: 'center', justifyContent: 'center',
      })}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '800', letterSpacing: 0.3 }}>{label}</Text>
      }
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function LoginScreen() {
  const [step, setStep]         = useState<Step>('phone');
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { sendOtp, verifyOtpLogin, loginWithPassword } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cooldown === 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const clearError = useCallback(() => setError(null), []);

  const handleContinue = useCallback(() => {
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    clearError();
    setStep('method');
  }, [phone, clearError]);

  const handleSendOtp = useCallback(async () => {
    setLoading(true);
    clearError();
    const result = await sendOtp(phone);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setOtp('');
    setCooldown(30);
    setStep('otp');
  }, [phone, sendOtp, clearError]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true);
    clearError();
    const result = await verifyOtpLogin(phone, otp);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.replace('/(tabs)/(home)');
  }, [otp, phone, verifyOtpLogin, clearError, router]);

  const handlePasswordLogin = useCallback(async () => {
    if (!password) { setError('Enter your password'); return; }
    setLoading(true);
    clearError();
    const result = await loginWithPassword(phone, password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.replace('/(tabs)/(home)');
  }, [password, phone, loginWithPassword, clearError]);

  const goBack = useCallback(() => {
    clearError();
    if (step === 'method')   { setStep('phone');  return; }
    if (step === 'password') { setStep('method'); return; }
    if (step === 'otp')      { setStep('method'); return; }
  }, [step, clearError]);

  const subtitle =
    step === 'phone'    ? 'Your cricket companion' :
    step === 'method'   ? `+91 ${phone}` :
    step === 'password' ? 'Enter your password' :
                          'Enter the code we sent you';

  return (
    <View style={{ flex: 1 }}>
      {/* Background */}
      <LinearGradient
        colors={['#0C1829', '#08101E', '#05070E']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{
        position: 'absolute', top: -100, alignSelf: 'center',
        width: 300, height: 300, borderRadius: 150,
        backgroundColor: colors.accent + '07',
      }} />
      {[240, 180, 130].map((s, i) => (
        <View key={i} style={{
          position: 'absolute', top: 80 - s / 2, alignSelf: 'center',
          width: s, height: s, borderRadius: s / 2,
          borderWidth: 1,
          borderColor: colors.accent + (i === 0 ? '0C' : i === 1 ? '18' : '28'),
        }} />
      ))}

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Back */}
            {step !== 'phone' && (
              <Pressable onPress={goBack} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingTop: spacing.md, gap: 4, alignSelf: 'flex-start',
              }}>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>Back</Text>
              </Pressable>
            )}

            {/* Logo */}
            <View style={{ alignItems: 'center', marginTop: step !== 'phone' ? spacing.xl : spacing.xxxl, marginBottom: spacing.xxl }}>
              <View style={{
                width: 108, height: 108, borderRadius: 54,
                borderWidth: 1.5, borderColor: colors.accent + '35',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: 96, height: 96, borderRadius: 48,
                  borderWidth: 1, borderColor: colors.accent + '20',
                  backgroundColor: colors.accent + '08',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={{ width: 72, height: 72, borderRadius: 36 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={{ color: '#fff', fontSize: 26, fontWeight: '900', marginTop: spacing.lg, letterSpacing: -0.5 }}>
                CricketIQ
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: 4 }}>
                {subtitle}
              </Text>
            </View>

            {/* ── Phone step ── */}
            {step === 'phone' && (
              <View style={{ gap: spacing.lg }}>
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm }}>
                    PHONE NUMBER
                  </Text>
                  <PhoneInput value={phone} onChange={setPhone} />
                </View>

                {error && <ErrorBox msg={error} />}

                <PrimaryButton label="Continue" onPress={handleContinue} disabled={phone.length !== 10} />

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xs }}>
                  <Text style={{ color: colors.textMuted, fontSize: font.sm }}>New here?</Text>
                  <Pressable onPress={() => router.replace('/signup')}>
                    <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>Create account</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Method picker ── */}
            {step === 'method' && (
              <View style={{ gap: spacing.md }}>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', marginBottom: spacing.xs }}>
                  How would you like to sign in?
                </Text>

                {/* Password */}
                <Pressable
                  onPress={() => { clearError(); setPassword(''); setStep('password'); }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.85 : 1,
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                    backgroundColor: colors.card, borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
                  })}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: colors.accent + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: font.base, fontWeight: '700' }}>Use Password</Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>Sign in with your password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>

                {/* OTP */}
                <Pressable
                  onPress={handleSendOtp}
                  disabled={loading}
                  style={({ pressed }) => ({
                    opacity: pressed || loading ? 0.85 : 1,
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
                    backgroundColor: colors.accent + '12', borderRadius: radius.md,
                    borderWidth: 1, borderColor: colors.accent + '40', padding: spacing.lg,
                  })}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: colors.accent + '22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {loading
                      ? <ActivityIndicator size="small" color={colors.accent} />
                      : <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.accent} />
                    }
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.accent, fontSize: font.base, fontWeight: '700' }}>Send OTP</Text>
                    <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>Receive a code via SMS</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.accent + '80'} />
                </Pressable>

                {error && <ErrorBox msg={error} />}
              </View>
            )}

            {/* ── Password step ── */}
            {step === 'password' && (
              <View style={{ gap: spacing.lg }}>
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm }}>
                    PASSWORD
                  </Text>
                  <PasswordInput value={password} onChange={setPassword} />
                </View>

                {error && <ErrorBox msg={error} />}

                <PrimaryButton label="Sign In" onPress={handlePasswordLogin} loading={loading} />

                <Pressable
                  onPress={() => { clearError(); handleSendOtp(); }}
                  style={{ alignItems: 'center', paddingVertical: spacing.sm }}
                >
                  <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                    Forgot password?{' '}
                    <Text style={{ color: colors.accent, fontWeight: '700' }}>Use OTP instead</Text>
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <View style={{ gap: spacing.xl }}>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', lineHeight: 22 }}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={{ color: '#fff', fontWeight: '700' }}>+91 {phone}</Text>
                </Text>

                <OtpInput value={otp} onChange={setOtp} />

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label="Verify & Sign In"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  disabled={otp.length !== 6}
                />

                <View style={{ alignItems: 'center' }}>
                  {cooldown > 0 ? (
                    <Text style={{ color: colors.textMuted, fontSize: font.sm }}>
                      Resend in <Text style={{ color: colors.accent, fontWeight: '700' }}>{cooldown}s</Text>
                    </Text>
                  ) : (
                    <Pressable onPress={handleSendOtp} disabled={loading}>
                      <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>Resend OTP</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
