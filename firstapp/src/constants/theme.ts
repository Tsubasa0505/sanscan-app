export const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#0EA5E9',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#8B5CF6',
  dark: '#1F2937',
  light: '#F3F4F6',
  gradient: {
    from: '#3B82F6',
    to: '#0EA5E9',
  }
} as const;

export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const Z_INDEX = {
  dropdown: 1000,
  modal: 1050,
  popover: 1100,
  tooltip: 1150,
  notification: 1200,
} as const;