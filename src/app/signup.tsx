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
import * as authService from '@/services/authService';
import { colors, spacing, font, radius } from '@/constants/theme';

type Step = 'details' | 'otp' | 'password';

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

// ── Text input ────────────────────────────────────────────────

const AuthInput = memo(function AuthInput({
  value, onChange, placeholder, icon, keyboardType = 'default', autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: string;
  keyboardType?: 'default' | 'number-pad';
  autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [autoFocus]);

  return (
    <Pressable onPress={() => ref.current?.focus()} style={{
      flexDirection: 'row', alignItems: 'center',
      borderRadius: radius.md, borderWidth: 1.5,
      borderColor: focused ? colors.accent : colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: spacing.lg, height: 56,
    }}>
      <Ionicons
        name={icon as any}
        size={18}
        color={focused ? colors.accent : colors.textMuted}
        style={{ marginRight: 12 }}
      />
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, color: '#fff', fontSize: font.base }}
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
      <Text style={{ color: colors.accent, fontSize: font.base, fontWeight: '700', marginRight: 8 }}>+91</Text>
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
  value, onChange, placeholder = 'Set a password',
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [focused, setFocused] = useState(false);
  const [show, setShow]       = useState(false);
  const ref = useRef<TextInput>(null);

  const toggleShow = useCallback(() => setShow((s) => !s), []);

  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  const strength =
    value.length === 0 ? 0 :
    value.length < 6   ? 1 :
    value.length < 10  ? 2 : 3;

  const strengthColor = ['transparent', '#ef4444', '#f59e0b', colors.success][strength];
  const strengthLabel = ['', 'Weak', 'Good', 'Strong'][strength];

  return (
    <View style={{ gap: 8 }}>
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
          placeholder={placeholder}
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

      {/* Strength bar */}
      {value.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
            {[1, 2, 3].map((lvl) => (
              <View key={lvl} style={{
                flex: 1, height: 3, borderRadius: 2,
                backgroundColor: strength >= lvl ? strengthColor : colors.border,
              }} />
            ))}
          </View>
          <Text style={{ color: strengthColor, fontSize: 10, fontWeight: '700', minWidth: 36 }}>{strengthLabel}</Text>
        </View>
      )}
    </View>
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

// ── Step indicator ────────────────────────────────────────────

function StepDots({ current }: { current: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: spacing.lg }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{
          width: i === current ? 20 : 7, height: 7, borderRadius: 3.5,
          backgroundColor: i === current ? colors.accent : (i < current ? colors.accent + '50' : colors.border),
        }} />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────

export default function SignupScreen() {
  const [step, setStep]         = useState<Step>('details');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { completeSignup, sendOtp } = useAuth();
  const router = useRouter();

  const stepIndex = step === 'details' ? 0 : step === 'otp' ? 1 : 2;

  useEffect(() => {
    if (cooldown === 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const clearError = useCallback(() => setError(null), []);

  // Step 1 → send OTP
  const handleSendOtp = useCallback(async () => {
    if (!name.trim())        { setError('Enter your name'); return; }
    if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
    setLoading(true);
    clearError();
    const result = await sendOtp(phone);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setOtp('');
    setCooldown(30);
    setStep('otp');
  }, [name, phone, sendOtp, clearError]);

  // Step 2 → verify OTP directly via authService (bypasses AuthContext so isAuthenticated stays false)
  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true);
    clearError();
    const result = await authService.verifyOtp(phone, otp);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    // OTP verified — Supabase session is now live but AuthContext.isAuthenticated is still false
    setStep('password');
  }, [otp, phone, clearError]);

  // Step 3 → set name + password → navigate to home
  const handleCompleteSignup = useCallback(async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    clearError();
    const result = await completeSignup(name.trim(), password);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    router.replace('/(tabs)/(home)');
  }, [password, name, completeSignup, clearError, router]);

  const handleResend = useCallback(async () => {
    setLoading(true);
    clearError();
    const result = await sendOtp(phone);
    setLoading(false);
    if (!result.success) { setError(result.error); return; }
    setOtp('');
    setCooldown(30);
  }, [phone, sendOtp, clearError]);

  const goBack = useCallback(() => {
    clearError();
    if (step === 'otp')      { setStep('details');  return; }
    if (step === 'password') { setStep('otp');      return; }
  }, [step, clearError]);

  const subtitle =
    step === 'details'  ? 'Create your account' :
    step === 'otp'      ? `Code sent to +91 ${phone}` :
                          `Welcome, ${name.split(' ')[0]}!`;

  return (
    <View style={{ flex: 1 }}>
      {/* Background */}
      <LinearGradient
        colors={['#0A1A12', '#08101E', '#05070E']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View style={{
        position: 'absolute', top: -80, right: -60,
        width: 260, height: 260, borderRadius: 130,
        backgroundColor: colors.success + '06',
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
            {step !== 'details' && (
              <Pressable onPress={goBack} style={{
                flexDirection: 'row', alignItems: 'center',
                paddingTop: spacing.md, gap: 4, alignSelf: 'flex-start',
              }}>
                <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: font.sm }}>Back</Text>
              </Pressable>
            )}

            {/* Logo */}
            <View style={{ alignItems: 'center', marginTop: step !== 'details' ? spacing.xl : spacing.xxxl, marginBottom: spacing.xl }}>
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

            <StepDots current={stepIndex} />

            {/* ── Details step ── */}
            {step === 'details' && (
              <View style={{ gap: spacing.md }}>
                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm }}>
                    YOUR NAME
                  </Text>
                  <AuthInput
                    value={name}
                    onChange={setName}
                    placeholder="Full name"
                    icon="person-outline"
                    autoFocus
                  />
                </View>

                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm }}>
                    PHONE NUMBER
                  </Text>
                  <PhoneInput value={phone} onChange={setPhone} />
                </View>

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label="Send OTP"
                  onPress={handleSendOtp}
                  loading={loading}
                  disabled={!name.trim() || phone.length !== 10}
                />

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.xs }}>
                  <Text style={{ color: colors.textMuted, fontSize: font.sm }}>Already have an account?</Text>
                  <Pressable onPress={() => router.replace('/login')}>
                    <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>Sign in</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <View style={{ gap: spacing.xl }}>
                <Text style={{ color: colors.textSecondary, fontSize: font.sm, textAlign: 'center', lineHeight: 22 }}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={{ color: '#fff', fontWeight: '700' }}>+91 {phone}</Text>
                </Text>

                <OtpInput value={otp} onChange={setOtp} />

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label="Verify Number"
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
                    <Pressable onPress={handleResend} disabled={loading}>
                      <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '700' }}>Resend OTP</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* ── Password step ── */}
            {step === 'password' && (
              <View style={{ gap: spacing.lg }}>
                {/* Success banner */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
                  backgroundColor: colors.success + '15', borderRadius: radius.sm,
                  paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
                  borderWidth: 1, borderColor: colors.success + '30',
                }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={{ color: colors.success, fontSize: font.sm, fontWeight: '600' }}>
                    Number verified — set your password
                  </Text>
                </View>

                <View>
                  <Text style={{ color: colors.textSecondary, fontSize: font.xs, fontWeight: '700', letterSpacing: 1, marginBottom: spacing.sm }}>
                    CREATE PASSWORD
                  </Text>
                  <PasswordInput value={password} onChange={setPassword} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 6 }}>
                    Minimum 6 characters
                  </Text>
                </View>

                {error && <ErrorBox msg={error} />}

                <PrimaryButton
                  label="Create Account"
                  onPress={handleCompleteSignup}
                  loading={loading}
                  disabled={password.length < 6}
                />
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
