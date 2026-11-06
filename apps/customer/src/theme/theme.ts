/**
 * Design tokens for Atarashi Logistics mobile applications.
 * Clean, elegant, luxury neomorphic aesthetic: pristine chalk/porcelain canvas,
 * elevated pure white cards, refined slate grey mid-tones, and authoritative deep black accents.
 * Zero green tints - strictly White, Grey, and Black monochrome hierarchy.
 */

export const theme = {
  colors: {
    // Primary Monochromatic Accents
    primary: '#0F172A',         // Bold obsidian black
    primaryHover: '#1E293B',    // Charcoal slate
    primaryLight: '#F1F5F9',    // Soft silver-grey pill / badge background
    primaryDark: '#000000',     // Pitch black
    dark: '#0F172A',            // High-contrast primary dark
    darkHover: '#1E293B',
    onDark: '#FFFFFF',          // High-contrast pure white text
    onPrimary: '#FFFFFF',

    // Surfaces & Canvas
    background: '#F8F9FA',      // Pristine porcelain / chalk canvas
    surface: '#FFFFFF',         // Pure elevated white card
    surfaceSubtle: '#F1F3F5',   // Recessed neutral light grey
    surfacePressed: '#E9ECEF',  // Tactile press state

    // Typography
    textPrimary: '#0F172A',     // Pure obsidian black heading/body
    textSecondary: '#475569',   // Sophisticated slate grey
    textMuted: '#94A3B8',       // Subtle refined silver grey

    // Hairline Borders
    border: '#E2E8F0',          // Crisp hairline border
    borderSubtle: '#F1F5F9',

    // Status Badges (Monochrome Harmonized)
    success: '#0F172A',         // High-contrast black status check
    successLight: '#F1F5F9',
    warning: '#D97706',         // Muted amber
    error: '#DC2626',           // Deep crimson
    info: '#2563EB',            // Cobalt blue
  },
  sizes: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 32, display: 40 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { xs: 8, sm: 12, md: 18, lg: 24, xl: 30, pill: 9999 },
  shadows: {
    card: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    button: { shadowColor: '#000000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
    floating: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
    glowGreen: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 },
    glowDark: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 4 },
  },
} as const;
