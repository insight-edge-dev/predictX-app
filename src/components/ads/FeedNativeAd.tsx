import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing, radius } from '@/constants/theme';
import { AD_UNITS } from '@/utils/adUnits';

let NativeAdMod: any = null;
try { NativeAdMod = require('react-native-google-mobile-ads'); } catch {}

export function FeedNativeAd() {
  const [nativeAd, setNativeAd] = useState<any>(null);

  useEffect(() => {
    if (!NativeAdMod) return;
    let ad: any;
    try {
      ad = NativeAdMod.NativeAd.createForAdRequest(AD_UNITS.NATIVE_FEED, {
        requestNonPersonalizedAdsOnly: false,
      });
      const unsubLoaded = ad.addEventListenerForAdEvent(NativeAdMod.AdEventType.LOADED, () => setNativeAd(ad));
      const unsubError  = ad.addEventListenerForAdEvent(NativeAdMod.AdEventType.ERROR,  () => {});
      try { ad.load(); } catch {}
      return () => { unsubLoaded(); unsubError(); };
    } catch {}
  }, []);

  if (!nativeAd || !NativeAdMod) return null;

  const { NativeAdView, HeadlineView, BodyView, CallToActionView, IconView, AdvertiserView } = NativeAdMod;

  return (
    <NativeAdView nativeAd={nativeAd} style={s.wrapper}>
      <View style={s.card}>
        <View style={s.badge}>
          <Text style={s.badgeText}>Ad</Text>
        </View>
        <View style={s.headerRow}>
          <IconView style={s.icon} />
          <View style={s.textBlock}>
            <HeadlineView style={s.headline} />
            <AdvertiserView style={s.advertiser} />
          </View>
          <CallToActionView style={s.cta} textStyle={s.ctaText} />
        </View>
        <BodyView style={s.body} />
      </View>
    </NativeAdView>
  );
}

const s = StyleSheet.create({
  wrapper:    { marginBottom: spacing.sm },
  card:       { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  badge:      { alignSelf: 'flex-start', backgroundColor: colors.accent + '20', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.accent + '40', marginBottom: spacing.sm },
  badgeText:  { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  headerRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  icon:       { width: 40, height: 40, borderRadius: 8 },
  textBlock:  { flex: 1, gap: 2 },
  headline:   { color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' },
  advertiser: { color: colors.textMuted, fontSize: font.xs },
  cta:        { backgroundColor: colors.accent, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2 },
  ctaText:    { color: '#FFFFFF', fontSize: font.xs, fontWeight: '700' },
  body:       { color: colors.textSecondary, fontSize: font.xs, lineHeight: 17, marginTop: spacing.xs },
});
