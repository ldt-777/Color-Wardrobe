/**
 * Conversioni di spazio colore.
 *
 * Tutta l'app ragiona in OKLab / OKLCH invece che in HSL: in OKLab la distanza
 * euclidea tra due colori corrisponde (molto piu' di RGB o HSL) alla differenza
 * che l'occhio percepisce davvero. E' quello che permette di ordinare i capi in
 * modo che la griglia "scorra" bene invece di saltare.
 */

export type Rgb = { r: number; g: number; b: number }; // 0..255
export type Oklab = { L: number; a: number; b: number };
export type Oklch = { L: number; C: number; h: number }; // h in gradi 0..360

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(channel: number): number {
  const c = channel <= 0.0031308 ? channel * 12.92 : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055;
  return clamp(Math.round(c * 255), 0, 255);
}

/** sRGB (0..255) -> OKLab, secondo la formulazione di Björn Ottosson. */
export function rgbToOklab({ r, g, b }: Rgb): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

export function oklabToRgb({ L, a, b }: Oklab): Rgb {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  };
}

export function oklabToOklch({ L, a, b }: Oklab): Oklch {
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  // Sotto una certa croma la tinta e' rumore numerico: la azzeriamo per non
  // far ballare i neutri nell'ordinamento per tinta.
  return { L, C, h: C < 1e-4 ? 0 : h };
}

export function oklchToOklab({ L, C, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180;
  return { L, a: Math.cos(rad) * C, b: Math.sin(rad) * C };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const hex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export const oklabToHex = (lab: Oklab): string => rgbToHex(oklabToRgb(lab));
export const hexToOklab = (hex: string): Oklab => rgbToOklab(hexToRgb(hex));
export const hexToOklch = (hex: string): Oklch => oklabToOklch(hexToOklab(hex));
export const oklchToHex = (lch: Oklch): string => oklabToHex(oklchToOklab(lch));

/** Distanza percettiva tra due colori (euclidea in OKLab). ~0.02 = quasi uguali. */
export function deltaE(a: Oklab, b: Oklab): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

/** Distanza angolare tra due tinte, 0..180. */
export function hueDistance(h1: number, h2: number): number {
  const d = Math.abs(((h1 - h2) % 360) + 360) % 360;
  return d > 180 ? 360 - d : d;
}

/** Luminanza relativa WCAG, per decidere se scrivere in chiaro o in scuro. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Colore di testo leggibile sopra un fondo dato. */
export function readableInk(backgroundHex: string): string {
  const bg = hexToRgb(backgroundHex);
  return contrastRatio(bg, { r: 255, g: 255, b: 255 }) >= 3.6 ? '#FFFFFF' : '#101014';
}

/** Sposta un colore verso il chiaro/scuro mantenendo tinta e croma. */
export function shiftLightness(hex: string, delta: number): string {
  const lch = hexToOklch(hex);
  return oklchToHex({ ...lch, L: clamp(lch.L + delta, 0, 1) });
}

/** Un colore e' "neutro" quando la croma e' cosi' bassa da non leggersi come tinta. */
export const NEUTRAL_CHROMA = 0.038;
export const isNeutral = (lch: Pick<Oklch, 'C'>) => lch.C < NEUTRAL_CHROMA;

/**
 * Quanto un colore e' "caldo": 1 sull'arancio/giallo, 0 sull'azzurro.
 * I neutri restano a 0.5, cioe' non spostano il giudizio.
 */
export function warmth(lch: Oklch): number {
  if (isNeutral(lch)) return 0.5;
  const rad = ((lch.h - 62) * Math.PI) / 180;
  return (Math.cos(rad) + 1) / 2;
}
