import { TestIds } from 'react-native-google-mobile-ads';

// Use test IDs in dev builds, real IDs in production EAS builds.
const PROD = !__DEV__;

export const AD_UNITS = {
  BANNER:       PROD ? 'ca-app-pub-4645762055732117/7450361557' : TestIds.BANNER,
  INTERSTITIAL: PROD ? 'ca-app-pub-4645762055732117/8651882729' : TestIds.INTERSTITIAL,
  NATIVE_FEED:  PROD ? 'ca-app-pub-4645762055732117/4820594713' : TestIds.GAM_NATIVE,
};

export const ADMOB_APP_ID = 'ca-app-pub-4645762055732117~3706557664';
