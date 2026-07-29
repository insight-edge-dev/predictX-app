// react-native-fbsdk-next is a native module — only works in a compiled build.
// Silently no-ops in Expo Go / plain Metro.

let AppEventsLogger: any = null;

try {
  AppEventsLogger = require('react-native-fbsdk-next').AppEventsLogger;
} catch {}

export function metaTrackLogin() {
  try {
    if (!AppEventsLogger) return;
    AppEventsLogger.logEvent('fb_mobile_activate_app');
  } catch {}
}

export function metaTrackSignUp() {
  try {
    if (!AppEventsLogger) return;
    AppEventsLogger.logEvent('fb_mobile_complete_registration', { method: 'phone_otp' });
  } catch {}
}

export function metaTrackMatchOpened(matchId: string, league: string) {
  try {
    if (!AppEventsLogger) return;
    AppEventsLogger.logEvent('match_opened', 1, { match_id: matchId, league });
  } catch {}
}

export function metaTrackPredictionMade(matchId: string) {
  try {
    if (!AppEventsLogger) return;
    AppEventsLogger.logEvent('prediction_made', 1, { match_id: matchId });
  } catch {}
}

// App opens are tracked automatically by the SDK via AndroidManifest meta-data.
