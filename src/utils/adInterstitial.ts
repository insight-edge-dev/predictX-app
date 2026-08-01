import { AD_UNITS } from './adUnits';

const COOLDOWN_MS = 3 * 60 * 1000;

let _ad:       any    = null;
let _loaded    = false;
let _lastShown = 0;

function getAdModule() {
  try { return require('react-native-google-mobile-ads'); } catch { return null; }
}

function getAd(): any {
  if (_ad) return _ad;
  const mod = getAdModule();
  if (!mod) return null;
  try {
    _ad = mod.InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: false,
    });
    _ad.addEventListenerForAdEvent(mod.AdEventType.LOADED, () => { _loaded = true; });
    _ad.addEventListenerForAdEvent(mod.AdEventType.CLOSED, () => {
      _loaded = false;
      preloadInterstitial();
    });
    _ad.addEventListenerForAdEvent(mod.AdEventType.ERROR, () => { _loaded = false; });
  } catch { _ad = null; }
  return _ad;
}

export function preloadInterstitial() {
  try { getAd()?.load(); } catch {}
}

export function showInterstitial() {
  if (!_loaded) return;
  const now = Date.now();
  if (now - _lastShown < COOLDOWN_MS) return;
  _lastShown = now;
  try { getAd()?.show(); } catch {}
}
