import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { SvgUri } from 'react-native-svg';

interface Props {
  logo?: string;
  flag:  string;
  size?: number;
}

function FlagFallback({ flag, size }: { flag: string; size: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#6B728018', alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.6 }}>{flag}</Text>
    </View>
  );
}

/** Team badge: crest image when available, flag emoji in a circle otherwise. */
export function TeamCrest({ logo, flag, size = 20 }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [logo]);

  const containerStyle = {
    width: size, height: size, borderRadius: size / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center' as const, justifyContent: 'center' as const,
    overflow: 'hidden' as const,
  };
  const innerSize = size * 0.72;

  if (logo && !failed) {
    if (logo.toLowerCase().endsWith('.svg')) {
      return (
        <View style={containerStyle}>
          <SvgUri
            uri={logo}
            width={innerSize}
            height={innerSize}
            onError={() => setFailed(true)}
            fallback={<Text style={{ fontSize: size * 0.45 }}>{flag}</Text>}
          />
        </View>
      );
    }
    return (
      <View style={containerStyle}>
        <Image
          source={{ uri: logo }}
          style={{ width: innerSize, height: innerSize }}
          contentFit="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  return <FlagFallback flag={flag} size={size} />;
}
