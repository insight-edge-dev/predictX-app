import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

// ── Types ────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
}

export interface SimpleResult {
  success: boolean;
  error: string | null;
}

// ── Helpers ──────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
}

function catchMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

function friendlyError(msg: string): string {
  const l = msg.toLowerCase();
  if (l.includes('token') && (l.includes('invalid') || l.includes('expired')))
    return 'Incorrect or expired OTP. Please try again.';
  if (l.includes('otp') && l.includes('expired'))
    return 'OTP has expired. Please request a new one.';
  if (l.includes('invalid login') || l.includes('invalid credentials') || l.includes('wrong password'))
    return 'Incorrect password.';
  if (l.includes('rate limit') || l.includes('too many'))
    return 'Too many attempts. Please wait a moment.';
  if (l.includes('user not found') || l.includes('no user'))
    return 'No account found with this number.';
  if (l.includes('password') && l.includes('least'))
    return 'Password must be at least 6 characters.';
  if (l.includes('phone') && l.includes('invalid'))
    return 'Invalid phone number.';
  return msg;
}

// ── Send OTP ─────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<SimpleResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: formatPhone(phone),
    });
    if (error) return { success: false, error: friendlyError(error.message) };
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: catchMsg(e, 'Failed to send OTP') };
  }
}

// ── Verify OTP ────────────────────────────────────────────────

export async function verifyOtp(phone: string, token: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formatPhone(phone),
      token,
      type: 'sms',
    });
    if (error) return { success: false, user: null, session: null, error: friendlyError(error.message) };
    return { success: true, user: data.user, session: data.session, error: null };
  } catch (e) {
    return { success: false, user: null, session: null, error: catchMsg(e, 'OTP verification failed') };
  }
}

// ── Sign In with Password ─────────────────────────────────────

export async function signInWithPassword(phone: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      phone: formatPhone(phone),
      password,
    });
    if (error) return { success: false, user: null, session: null, error: friendlyError(error.message) };
    return { success: true, user: data.user, session: data.session, error: null };
  } catch (e) {
    return { success: false, user: null, session: null, error: catchMsg(e, 'Login failed') };
  }
}

// ── Update user details (name + password — called after OTP verify in signup) ──

export async function updateUserDetails(
  displayName: string,
  password: string,
): Promise<SimpleResult> {
  try {
    const { error } = await supabase.auth.updateUser({
      password,
      data: { display_name: displayName },
    });
    if (error) return { success: false, error: friendlyError(error.message) };
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: catchMsg(e, 'Failed to update account') };
  }
}

// ── Sign Out ─────────────────────────────────────────────────

export async function signOut(): Promise<SimpleResult> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: catchMsg(e, 'Logout failed') };
  }
}

// ── Session ──────────────────────────────────────────────────

export async function getSession(): Promise<{ session: Session | null; error: string | null }> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return { session: null, error: error.message };
    return { session: data.session, error: null };
  } catch (e) {
    return { session: null, error: catchMsg(e, 'Failed to restore session') };
  }
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return data.subscription;
}
