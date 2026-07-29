// @react-native-firebase modules are native — they only work in a compiled
// native build (EAS / expo run:android). In Expo Go / plain Metro they throw
// "Native module not found". All exports silently no-op in that case.

let crashlytics: any = null;
let analytics: any = null;

try {
  crashlytics = require('@react-native-firebase/crashlytics').default;
} catch {}

try {
  analytics = require('@react-native-firebase/analytics').default;
} catch {}

// ── Crashlytics ──────────────────────────────────────────────────────────────

export function recordError(error: Error, context?: string) {
  try {
    if (!crashlytics) return;
    if (context) crashlytics().log(context);
    crashlytics().recordError(error);
  } catch {}
}

export function setUserForCrashlytics(userId: string, phone?: string) {
  try {
    if (!crashlytics) return;
    crashlytics().setUserId(userId);
    if (phone) crashlytics().setAttribute('phone', phone);
  } catch {}
}

export function clearUserForCrashlytics() {
  try {
    if (!crashlytics) return;
    crashlytics().setUserId('');
  } catch {}
}

export function logCrashlytics(message: string) {
  try {
    if (!crashlytics) return;
    crashlytics().log(message);
  } catch {}
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function trackScreenView(screenName: string) {
  try {
    if (!analytics) return;
    await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch {}
}

export async function trackMatchOpened(matchId: string | number, teams: string, league: string) {
  try {
    if (!analytics) return;
    await analytics().logEvent('match_opened', { match_id: String(matchId), teams, league });
  } catch {}
}

export async function trackPredictionMade(matchId: string | number, prediction: string) {
  try {
    if (!analytics) return;
    await analytics().logEvent('prediction_made', { match_id: String(matchId), prediction });
  } catch {}
}

export async function trackLogin(method: string = 'phone_otp') {
  try {
    if (!analytics) return;
    await analytics().logLogin({ method });
  } catch {}
}

export async function trackSignUp(method: string = 'phone_otp') {
  try {
    if (!analytics) return;
    await analytics().logSignUp({ method });
  } catch {}
}

export async function trackNewsOpened(articleId: string, title: string) {
  try {
    if (!analytics) return;
    await analytics().logEvent('news_opened', { article_id: articleId, title });
  } catch {}
}

export async function trackLeagueChanged(league: string) {
  try {
    if (!analytics) return;
    await analytics().logEvent('league_changed', { league });
  } catch {}
}
