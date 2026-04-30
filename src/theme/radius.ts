export const radius = {
  card: 16,
  button: 12,
  small: 8,
} as const;

export type RadiusKey = keyof typeof radius;
