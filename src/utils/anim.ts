import { Easing } from 'react-native-reanimated';

export const springs = {
  snappy: { mass: 0.6, damping: 16, stiffness: 200 },
  smooth: { mass: 0.8, damping: 20, stiffness: 160 },
  bouncy: { mass: 0.5, damping: 10, stiffness: 220 },
} as const;

export const timings = {
  fast:   { duration: 150, easing: Easing.out(Easing.cubic) },
  medium: { duration: 250, easing: Easing.inOut(Easing.cubic) },
  slow:   { duration: 400, easing: Easing.out(Easing.quad)  },
} as const;

export const STAGGER_STEP_MS = 60;
export const STAGGER_MAX_MS  = 300;
