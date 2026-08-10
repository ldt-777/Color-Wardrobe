import { hueDistance, isNeutral, type Oklch } from './space';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Campana centrata su `center`: 1 al centro, che decade in `width` gradi. */
const bell = (value: number, center: number, width: number) =>
  Math.exp(-Math.pow((value - center) / width, 2));

/**
 * Quanto due colori stanno bene insieme, da 0 a 1.
 *
 * Non e' una regola inventata: sono le tre relazioni classiche della ruota
 * cromatica (analogia, complementare, triade) pesate poi dal contrasto di
 * luminosita', che e' cio' che nella pratica separa un abbinamento leggibile da
 * uno che "sbava".
 */
export function harmonyScore(a: Oklch, b: Oklch): number {
  const lightnessContrast = 0.55 + 0.45 * Math.min(Math.abs(a.L - b.L) / 0.28, 1);

  if (isNeutral(a) || isNeutral(b)) {
    // Un neutro accompagna qualsiasi tinta: quello che conta e' che i due non
    // si appiattiscano sullo stesso livello di luce.
    return clamp01(0.78 * lightnessContrast);
  }

  const distance = hueDistance(a.h, b.h);
  const relation = Math.max(
    bell(distance, 0, 26) * 0.85, // analoghi
    bell(distance, 180, 34) * 1.0, // complementari
    bell(distance, 120, 22) * 0.8 // triade
  );

  // Due tinte entrambe sature litigano piu' di quanto la geometria suggerisca.
  const chromaPenalty = a.C > 0.16 && b.C > 0.16 ? 0.85 : 1;

  return clamp01(relation * lightnessContrast * chromaPenalty);
}

/** Soglia oltre la quale consideriamo due capi effettivamente abbinabili. */
export const HARMONY_THRESHOLD = 0.5;

export const pairsWell = (a: Oklch, b: Oklch) => harmonyScore(a, b) >= HARMONY_THRESHOLD;
