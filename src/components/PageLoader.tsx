import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '@/constants/theme';

const animSource = require('../../assets/animations/loading.json');

export function PageLoader({ show }: { show: boolean }) {
  const [visible, setVisible] = useState(show);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (show) {
      clearTimeout(timer.current);
      setVisible(true);
    } else {
      timer.current = setTimeout(() => setVisible(false), 1500);
    }
    return () => clearTimeout(timer.current);
  }, [show]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
    >
      <LottieView
        source={animSource}
        autoPlay
        loop
        style={{ width: 150, height: 150 }}
      />
    </View>
  );
}
