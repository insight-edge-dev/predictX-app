import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
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

  if (logo && !failed) {
    // football-data.org serves many crests as SVG, which <Image> can't render.
    if (logo.toLowerCase().endsWith('.svg')) {
      return (
        <SvgUri
          uri={logo}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          fallback={<FlagFallback flag={flag} size={size} />}
        />
      );
    }
    return (
      <Image
        source={{ uri: logo }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return <FlagFallback flag={flag} size={size} />;
}
