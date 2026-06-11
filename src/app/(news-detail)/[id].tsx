/**
 * News detail screen — full article from Cricbuzz API.
 */

import {
  View, Text, ScrollView, Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNewsDetail } from '@/hooks/useHome';
import { API_BASE_URL } from '@/config/api';
import { colors, spacing, font, radius } from '@/constants/theme';

function proxyImg(imageId: string | null | undefined) {
  if (!imageId) return null;
  return `${API_BASE_URL.replace('/api', '')}/api/img/news/${imageId}`;
}

function formatDate(ts: number | null) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

export default function NewsDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { data: article, isLoading, isError } = useNewsDetail(id);

  const coverUri = proxyImg(article?.coverImage?.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FB' }}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
          })}
        >
          <Ionicons name="arrow-back" size={20} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '600' }}>Back</Text>
        </Pressable>

        {/* Loading */}
        {isLoading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={{ color: colors.textMuted, fontSize: font.sm, marginTop: spacing.lg }}>
              Loading article…
            </Text>
          </View>
        )}

        {/* Error */}
        {isError && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: font.md, marginTop: spacing.lg, textAlign: 'center' }}>
              Could not load article
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: spacing.xl }}>
              <Text style={{ color: colors.accent, fontSize: font.sm }}>Go back</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        {!isLoading && !isError && article && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 80 }}
          >
            {/* Cover image */}
            {coverUri ? (
              <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.xl }}>
                <ExpoImage
                  source={{ uri: coverUri }}
                  style={{ width: '100%', height: 220 }}
                  contentFit="cover"
                  cachePolicy="disk"
                  transition={300}
                  placeholder={{ color: colors.cardElevated }}
                />
                {article.coverImage?.caption ? (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: spacing.sm }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: font.xs, fontStyle: 'italic' }}>
                      {article.coverImage.caption}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={{
                marginHorizontal: spacing.lg, borderRadius: radius.xl, overflow: 'hidden',
                height: 160, backgroundColor: colors.card, marginBottom: spacing.xl,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Ionicons name="newspaper-outline" size={44} color={colors.textMuted} />
              </View>
            )}

            <View style={{ paddingHorizontal: spacing.lg }}>
              {/* Context + date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                {article.context ? (
                  <View style={{
                    backgroundColor: colors.accent + '18', borderRadius: 6,
                    paddingHorizontal: 10, paddingVertical: 4,
                    borderWidth: 1, borderColor: colors.accent + '30',
                  }}>
                    <Text style={{ color: colors.accent, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 }}>
                      {article.context.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accent }} />
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, fontWeight: '600' }}>Cricbuzz</Text>
                </View>
              </View>

              {/* Headline */}
              <Text style={{
                color: colors.textPrimary, fontSize: font.xl, fontWeight: '800',
                lineHeight: 30, marginBottom: spacing.sm, letterSpacing: -0.3,
              }}>
                {article.headline}
              </Text>

              {/* Publish time */}
              {article.publishTime ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.xl }}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>
                    {formatDate(article.publishTime)}
                  </Text>
                </View>
              ) : null}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.xl }} />

              {/* Article body */}
              {article.paragraphs.map((para, idx) => (
                <Text
                  key={idx}
                  style={{
                    color:        idx === 0 ? colors.textSecondary : '#CBD5E1',
                    fontSize:     font.base,
                    lineHeight:   26,
                    marginBottom: spacing.lg,
                    fontWeight:   idx === 0 ? '500' : '400',
                  }}
                >
                  {para}
                </Text>
              ))}

              {/* Source footer */}
              <View style={{
                marginTop: spacing.lg, padding: spacing.lg,
                backgroundColor: colors.card, borderRadius: radius.md,
                borderWidth: 1, borderColor: colors.border,
                flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: colors.accent + '18', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="newspaper" size={18} color={colors.accent} />
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: font.sm, fontWeight: '700' }}>Cricbuzz</Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs, marginTop: 2 }}>
                    Original article on Cricbuzz
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
