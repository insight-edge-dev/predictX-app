/**
 * Design system — PredictX
 * Light theme, 8-point spacing grid. Cricbuzz / SofaScore quality.
 */

export const colors = {
  // Surfaces
  bg:           '#F8F9FB',
  card:         '#FFFFFF',
  cardElevated: '#F3F4F6',

  // Borders
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',

  // Brand (blue — used for active nav, CTAs, links)
  accent:    '#2563EB',
  accentDim: 'rgba(37, 99, 235, 0.08)',

  // Live / red
  live:    '#DC2626',
  liveDim: 'rgba(220, 38, 38, 0.08)',

  // Win / green
  success:    '#16A34A',
  successDim: 'rgba(22, 163, 74, 0.08)',

  // Warning / upcoming
  warning:    '#D97706',
  warningDim: 'rgba(217, 119, 6, 0.08)',

  // Danger
  danger:    '#DC2626',
  dangerDim: 'rgba(220, 38, 38, 0.08)',

  // Text
  textPrimary:   '#111827',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',

  // IPL team brand colours (unchanged — used for logo fallback circles)
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

// 8-point spacing grid
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

// Border radii — restrained, native-feeling
export const radius = {
  sm:  6,
  md:  10,
  lg:  12,
  xl:  16,
  xxl: 20,
};

// Typography scale — 5-level hierarchy
// Page Title: xxxl/700 | Section: lg/600 | Card Title: base/600
// Body: md/400       | Metadata: sm/400  | Tag: xs/600
export const font = {
  xs:   11,
  sm:   12,
  md:   14,
  base: 15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 28,
};
