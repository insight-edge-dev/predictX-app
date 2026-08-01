import { View } from 'react-native';
import { AD_UNITS } from '@/utils/adUnits';

let BannerAd:     any = null;
let BannerAdSize: any = null;
try {
  const mod  = require('react-native-google-mobile-ads');
  BannerAd     = mod.BannerAd;
  BannerAdSize = mod.BannerAdSize;
} catch {}

export function AppBanner() {
  if (!BannerAd) return null;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={AD_UNITS.BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
