import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNITS } from '@/utils/adUnits';

export function AppBanner() {
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
