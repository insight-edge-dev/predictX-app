/**
 * Venue profile screen — /venue/[id]
 * Shows stadium name, city, country, capacity, floodlight, image.
 */

import { View, Text, Pressable, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVenue } from '@/hooks/useVenue';
import { colors, spacing, font, radius } from '@/constants/theme';

export default function VenueScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { data, isLoading } = useVenue(id);
  const venue = data?.venue;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection:  'row',
          alignItems:     'center',
          paddingHorizontal: spacing.lg,
          paddingVertical:   spacing.md,
          backgroundColor:   colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, marginRight: spacing.md })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ color: colors.textPrimary, fontSize: font.base, fontWeight: '700', flex: 1 }}>
          Venue
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !venue ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl }}>
          <Ionicons name="location-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textSecondary, fontSize: font.base, marginTop: spacing.lg, textAlign: 'center' }}>
            Venue information not available
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxxl }}>
          {/* Hero image */}
          {venue.image ? (
            <Image
              source={{ uri: venue.image }}
              style={{ width: '100%', height: 200, backgroundColor: colors.cardElevated }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: '100%', height: 180,
                backgroundColor: colors.cardElevated,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Ionicons name="business-outline" size={64} color={colors.textMuted} />
            </View>
          )}

          <View style={{ padding: spacing.lg }}>
            {/* Name */}
            <Text
              style={{
                color:       colors.textPrimary,
                fontSize:    font.xxl,
                fontWeight:  '800',
                letterSpacing: -0.5,
                marginBottom: spacing.xs,
              }}
            >
              {venue.name}
            </Text>

            {/* City, Country */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.xl }}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={{ color: colors.textSecondary, fontSize: font.base }}>
                {[venue.city, venue.country].filter(Boolean).join(', ')}
              </Text>
            </View>

            {/* Stats row */}
            <View
              style={{
                flexDirection:  'row',
                gap:            spacing.sm,
                marginBottom:   spacing.xl,
              }}
            >
              {venue.capacity && (
                <View
                  style={{
                    flex:            1,
                    backgroundColor: colors.card,
                    borderRadius:    radius.md,
                    borderWidth:     1,
                    borderColor:     colors.border,
                    padding:         spacing.lg,
                    alignItems:      'center',
                    gap:             spacing.xs,
                  }}
                >
                  <Ionicons name="people-outline" size={20} color={colors.accent} />
                  <Text style={{ color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' }}>
                    {Number(venue.capacity).toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Capacity</Text>
                </View>
              )}

              <View
                style={{
                  flex:            1,
                  backgroundColor: colors.card,
                  borderRadius:    radius.md,
                  borderWidth:     1,
                  borderColor:     colors.border,
                  padding:         spacing.lg,
                  alignItems:      'center',
                  gap:             spacing.xs,
                }}
              >
                <Ionicons
                  name={venue.floodlight ? 'bulb' : 'bulb-outline'}
                  size={20}
                  color={venue.floodlight ? colors.warning : colors.textMuted}
                />
                <Text
                  style={{
                    color:      venue.floodlight ? colors.textPrimary : colors.textMuted,
                    fontSize:   font.base,
                    fontWeight: '700',
                  }}
                >
                  {venue.floodlight ? 'Yes' : 'No'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: font.xs }}>Floodlights</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
