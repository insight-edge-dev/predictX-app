import { useEffect, useRef } from 'react';
import { Animated, Pressable, Image, Dimensions, View, Linking, type ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useLeague } from '@/contexts/LeagueContext';
import { useBanners, type Banner } from '@/hooks/useBanners';
import { colors, spacing, radius } from '@/constants/theme';

const SCREEN_WIDTH  = Dimensions.get('window').width;
const ITEM_WIDTH    = SCREEN_WIDTH - spacing.lg * 2;
const ITEM_HEIGHT   = ITEM_WIDTH * 0.46;
const ITEM_SPACING  = 10;
const SNAP_INTERVAL = ITEM_WIDTH + ITEM_SPACING;
const AUTO_ROTATE_MS = 4500;

interface Props {
  placement: string;
  /** Discovery screen passes this to switch into a league's home view. */
  onNavigateLeagueHome?: (slug: string) => void;
}

export function BannerCarousel({ placement, onNavigateLeagueHome }: Props) {
  const router = useRouter();
  const { setLeagueId } = useLeague();
  const { data: banners = [] } = useBanners(placement);

  const scrollRef    = useRef<ScrollView>(null);
  const scrollX      = useRef(new Animated.Value(0)).current;
  const indexRef     = useRef(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAutoRotate = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (banners.length <= 1) return;
    intervalRef.current = setInterval(() => {
      const next = (indexRef.current + 1) % banners.length;
      indexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * SNAP_INTERVAL, animated: true });
    }, AUTO_ROTATE_MS);
  };

  useEffect(() => {
    indexRef.current = 0;
    startAutoRotate();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  if (banners.length === 0) return null;

  function handlePress(banner: Banner) {
    switch (banner.link_type) {
      case 'external':
        if (banner.link_value) Linking.openURL(banner.link_value);
        break;
      case 'match':
        if (banner.link_meta?.league) setLeagueId(banner.link_meta.league);
        router.push(`/(match-details)/${banner.link_value}` as any);
        break;
      case 'tip':
        if (banner.link_meta?.league) setLeagueId(banner.link_meta.league);
        router.push(`/(tip-detail)/${banner.link_value}` as any);
        break;
      case 'league_home':
        if (banner.link_value) {
          setLeagueId(banner.link_value);
          onNavigateLeagueHome?.(banner.link_value);
        }
        break;
      case 'app_section':
        if (banner.link_value) router.push(banner.link_value as any);
        break;
      default:
        break;
    }
  }

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: ITEM_SPACING }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onScrollBeginDrag={() => {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }}
        onMomentumScrollEnd={(e) => {
          indexRef.current = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
          startAutoRotate();
        }}
      >
        {banners.map(banner => (
          <Pressable
            key={banner.id}
            onPress={() => handlePress(banner)}
            style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
          >
            <Image
              source={{ uri: banner.image_url }}
              resizeMode="cover"
              style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT, borderRadius: radius.xl, backgroundColor: colors.cardElevated }}
            />
          </Pressable>
        ))}
      </Animated.ScrollView>

      {banners.length > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: spacing.sm }}>
          {banners.map((_, i) => {
            const inputRange = [
              (i - 1) * SNAP_INTERVAL,
              i * SNAP_INTERVAL,
              (i + 1) * SNAP_INTERVAL,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [6, 18, 6],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={{
                  width: dotWidth, height: 6, borderRadius: 3,
                  backgroundColor: colors.accent, opacity,
                }}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}
