/**
 * Design system — single source of truth for the app's visual language.
 * Premium dark theme: deep navy bg, amber gold accent.
 */

export const colors = {
  bg:           '#07080F',
  card:         '#0D1421',
  cardElevated: '#152130',
  border:       '#1A2B3D',

  accent:    '#F59E0B',
  accentDim: 'rgba(245, 158, 11, 0.12)',

  live:    '#F43F5E',
  liveDim: 'rgba(244, 63, 94, 0.12)',

  success:    '#10B981',
  successDim: 'rgba(16, 185, 129, 0.12)',

  warning:    '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.12)',

  danger:    '#EF4444',
  dangerDim: 'rgba(239, 68, 68, 0.12)',

  textPrimary:   '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted:     '#475569',

  // IPL team brand colours
  team: {
    CSK:  '#F9CD05',
    MI:   '#004BA0',
    RCB:  '#EC1C24',
    KKR:  '#3A225D',
    SRH:  '#F26522',
    DC:   '#17479E',
    RR:   '#EA1A85',
    PBKS: '#ED1B24',
    GT:   '#5B8CFF',
    LSG:  '#00AEEF',
  } as Record<string, string>,
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const font = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 16,
  lg:   18,
  xl:   22,
  xxl:  28,
  xxxl: 34,
};
