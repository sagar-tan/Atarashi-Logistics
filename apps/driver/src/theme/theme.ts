/**
 * Design tokens for the Atarashi mobile apps.
 * Source: Atarashi EcoCharge app (design/reference/ecocharge-mobile.md).
 * Neomorphic light mode: chalk canvas, white extruded cards, mint accent, soft low-contrast shadows.
 * Keep this file identical in apps/customer and apps/driver.
 */

export const theme = {
  colors: {
    primary: '#6EE787',
    primaryHover: '#5EDB79',
    primaryLight: '#E8F9EC',
    primaryDark: '#2F8544',
    dark: '#111813',
    darkHover: '#1D2720',
    onDark: '#FFFFFF',
    onPrimary: '#111813',

    background: '#F4F7F4',
    surface: '#FFFFFF',
    surfaceSubtle: '#EDF2EE',
    surfacePressed: '#E5EBE6',

    textPrimary: '#111813',
    textSecondary: '#5A6E60',
    textMuted: '#8A9E90',

    border: '#E2E9E3',

    success: '#5EDB79',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#38BDF8',
  },
  sizes: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 32, display: 40 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { xs: 8, sm: 12, md: 18, lg: 24, xl: 30, pill: 9999 },
  shadows: {
    card: { shadowColor: '#0E1E12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1.5 },
    button: { shadowColor: '#0E1E12', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    floating: { shadowColor: '#0E1E12', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 3 },
    glowGreen: { shadowColor: '#6EE787', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 2 },
  },
} as const;
