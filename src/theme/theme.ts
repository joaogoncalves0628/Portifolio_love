export type ThemeMode = 'dark' | 'light';

export const palette = {
  dark: {
    background: '#0f0507',
    backgroundAlt: '#170b0e',
    surface: '#12070a',
    surfaceAlt: '#1a0c10',
    elevated: '#251218',
    primary: '#e05370',
    primaryStrong: '#c43355',
    wine: '#4a0e17',
    champagne: '#e6c594',
    textMuted: '#a39296',
    text: '#fcedef',
    white: '#ffffff',
    border: 'rgba(255,255,255,0.08)',
    panel: 'rgba(255,255,255,0.06)',
    glow: 'rgba(224,83,112,0.35)',
  },
  light: {
    background: '#fdf8f9',
    backgroundAlt: '#fff7f8',
    surface: '#ffffff',
    surfaceAlt: '#f7f2f3',
    elevated: '#f1e5e7',
    primary: '#b83a54',
    primaryStrong: '#581423',
    wine: '#581423',
    champagne: '#c8894a',
    textMuted: '#6e5a60',
    text: '#26151b',
    white: '#ffffff',
    border: '#eedde1',
    panel: '#f6edf0',
    glow: 'rgba(184,58,84,0.16)',
  },
} as const;

export const fonts = {
  playfair: 'PlayfairDisplay_700Bold',
  jakarta: 'PlusJakartaSans_400Regular',
  jakartaBold: 'PlusJakartaSans_700Bold',
  jakartaSemibold: 'PlusJakartaSans_600SemiBold',
};
