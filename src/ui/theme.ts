import { useColorScheme } from 'react-native';

/**
 * La palette dell'interfaccia e' volutamente priva di colore: grigi caldi e
 * nient'altro. L'unico colore che deve arrivare all'occhio e' quello dei capi,
 * altrimenti il guardaroba compete con la chrome dell'app.
 */
export type Theme = {
  dark: boolean;
  background: string;
  surface: string;
  surfaceMuted: string;
  line: string;
  text: string;
  textMuted: string;
  overlay: string;
};

const light: Theme = {
  dark: false,
  background: '#FBFAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEB',
  line: '#E7E3DC',
  text: '#141317',
  // Misurato contro tutti i fondi su cui il testo tenue poggia davvero: la
  // shell, le superfici e i sei fondi di mood. Il grigio precedente (#7C7871)
  // scendeva a 3,25:1 sul fondo di "Notte", sotto il 4,5:1 che serve a un
  // testo piccolo; questo tiene 4,9:1 nel caso peggiore.
  textMuted: '#605C55',
  overlay: 'rgba(20, 19, 23, 0.55)',
};

const dark: Theme = {
  dark: true,
  background: '#0D0D0F',
  surface: '#17171A',
  surfaceMuted: '#1E1E22',
  line: '#27272C',
  text: '#F3F1ED',
  // Come sopra: #8A867F scendeva a 4,14:1 sul fondo scuro di "Terra", che e'
  // il piu' chiaro dei sei. Questo tiene 5,1:1.
  textMuted: '#9C978C',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const useTheme = (): Theme => (useColorScheme() === 'dark' ? dark : light);

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 22,
  xl: 34,
  xxl: 52,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const type = {
  display: { fontSize: 34, fontWeight: '300' as const, letterSpacing: -0.8 },
  title: { fontSize: 22, fontWeight: '400' as const, letterSpacing: -0.4 },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const, letterSpacing: 0.1 },
  caption: { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.6 },
} as const;
