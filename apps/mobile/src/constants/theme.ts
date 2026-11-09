import { Platform } from 'react-native';

/**
 * Sakin, kâğıt tonlarında bir palet. Amaç uyarmak değil, dinlendirmek:
 * parlak bildirim kırmızıları, yanıp sönen rozetler yok.
 */
export const Colors = {
  light: {
    background: '#F6F4EF',
    surface: '#FFFFFF',
    surfaceMuted: '#EEEBE4',
    border: '#E2DDD3',
    text: '#1E1C19',
    textSecondary: '#6A655C',
    accent: '#2F6B4F',
    accentText: '#FFFFFF',
    accentSoft: '#E1EEE6',
    danger: '#A8443A',
    ogren: '#3A6894',
    uygula: '#2F6B4F',
    ilham: '#A26A1B',
    yansit: '#6A5A92',
    tekrar: '#5B6470',
  },
  dark: {
    background: '#121311',
    surface: '#1B1D1A',
    surfaceMuted: '#242722',
    border: '#30342E',
    text: '#F1EFEA',
    textSecondary: '#A7A298',
    accent: '#7CC4A0',
    accentText: '#0E1A14',
    accentSoft: '#21342A',
    danger: '#E08A7F',
    ogren: '#8DB4DC',
    uygula: '#7CC4A0',
    ilham: '#E2B26A',
    yansit: '#B6A6E0',
    tekrar: '#AEB6C0',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;

export const MaxContentWidth = 640;

/** Native sekme çubuğunun içerik altında bıraktığı boşluk. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
