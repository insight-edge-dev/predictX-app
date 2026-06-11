import { View, Text, Image } from 'react-native';

interface Props {
  logo?: string;
  flag:  string;
  size?: number;
}

/** Team badge: crest image when available, flag emoji in a circle otherwise. */
export function TeamCrest({ logo, flag, size = 20 }: Props) {
  if (logo) {
    return <Image source={{ uri: logo }} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#6B728018', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.6 }}>{flag}</Text>
    </View>
  );
}
