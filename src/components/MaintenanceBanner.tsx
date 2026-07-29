import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, font } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRemoteConfig } from '@/hooks/useRemoteConfig';

export default function MaintenanceBanner() {
  const { maintenance_mode, maintenance_message } = useRemoteConfig();
  const insets = useSafeAreaInsets();

  if (!maintenance_mode) return null;

  return (
    <View style={{
      position: 'absolute', top: insets.top, left: 0, right: 0, zIndex: 10000,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, paddingVertical: 12, paddingHorizontal: 16,
      backgroundColor: '#1a0a00',
      borderBottomWidth: 1, borderBottomColor: colors.danger + '50',
    }}>
      <Ionicons name="construct-outline" size={14} color={colors.danger} />
      <Text style={{ color: colors.danger, fontSize: font.xs, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1 }}>
        {maintenance_message || 'PredictX is under maintenance. Back shortly!'}
      </Text>
    </View>
  );
}
