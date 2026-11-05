export const theme = {
  colors: {
    background: '#101820',
    surface: '#1A2833',
    surfaceRaised: '#243846',
    text: '#F4F0E8',
    muted: '#A9B8C2',
    accent: '#D5A84A',
    accentCool: '#76B7B2',
    line: 'rgba(244, 240, 232, 0.18)',
  },
  typography: {
    display: 'Arial, sans-serif',
    body: 'Arial, sans-serif',
    label: 'Arial, sans-serif',
  },
  spacing: {
    edge: 112,
    gap: 28,
  },
  motion: {
    entranceFrames: 24,
    staggerFrames: 7,
    exitFrames: 14,
  },
} as const;
