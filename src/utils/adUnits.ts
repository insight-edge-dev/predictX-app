// Static imports from react-native-google-mobile-ads throw TurboModuleRegistry
// errors in Expo Go (native module not bundled). Use lazy require + catch so the
// module evaluates without crashing; ads silently do nothing in Expo Go.
let TestIds: any = null;
try { TestIds = require('react-native-google-mobile-ads').TestIds; } catch {}

const PROD = !__DEV__;

export const AD_UNITS = {
  BANNER:       (PROD || !TestIds) ? 'ca-app-pub-4645762055732117/7450361557' : TestIds.BANNER,
  INTERSTITIAL: (PROD || !TestIds) ? 'ca-app-pub-4645762055732117/8651882729' : TestIds.INTERSTITIAL,
  NATIVE_FEED:  (PROD || !TestIds) ? 'ca-app-pub-4645762055732117/4820594713' : TestIds.GAM_NATIVE,
};

export const ADMOB_APP_ID = 'ca-app-pub-4645762055732117~3706557664';
