import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';

const COOLDOWN_MS = 3 * 60 * 1000; // max once per 3 minutes

let _ad:       InterstitialAd | null = null;
let _loaded    = false;
let _lastShown = 0;

function getAd(): InterstitialAd {
  if (!_ad) {
    _ad = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });
    _ad.addEventListenerForAdEvent(AdEventType.LOADED, () => { _loaded = true; });
    _ad.addEventListenerForAdEvent(AdEventType.CLOSED, () => {
      _loaded = false;
      preloadInterstitial();
    });
    _ad.addEventListenerForAdEvent(AdEventType.ERROR, () => { _loaded = false; });
  }
  return _ad;
}

export function preloadInterstitial() {
  try { getAd().load(); } catch {}
}

export function showInterstitial() {
  if (!_loaded) return;
  const now = Date.now();
  if (now - _lastShown < COOLDOWN_MS) return;
  _lastShown = now;
  try { getAd().show(); } catch {}
}
