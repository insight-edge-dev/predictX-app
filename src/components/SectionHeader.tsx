import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, spacing } from "@/constants/theme";

interface SectionHeaderProps {
  title:      string;
  onMore?:    () => void;
  moreLabel?: string;
}

export function SectionHeader({ title, onMore, moreLabel = 'See all' }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   spacing.md,
      }}
    >
      <Text
        style={{
          color:      colors.textPrimary,
          fontSize:   font.lg,
          fontWeight: '700',
          letterSpacing: -0.2,
        }}
      >
        {title}
      </Text>

      {onMore && (
        <Pressable
          onPress={onMore}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 2 })}
        >
          <Text style={{ color: colors.accent, fontSize: font.sm, fontWeight: '600' }}>
            {moreLabel}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.accent} />
        </Pressable>
      )}
    </View>
  );
}
