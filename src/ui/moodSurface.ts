import type { MoodId } from '../color/moods';
import { oklchToHex } from '../color/space';

/**
 * Il fondo neutro su cui poggia ogni capo nella griglia.
 *
 * Sono neutri veri: la croma resta sotto 0.02, cioe' sotto la soglia in cui
 * l'occhio legge una tinta. Quel poco che c'e' serve solo a dare temperatura —
 * "Terra" tende alla sabbia, "Notte" al grigio freddo — senza mai entrare in
 * competizione con il colore del capo, che deve restare l'unica cosa colorata
 * dello schermo.
 */
type Surface = { light: { L: number; C: number; h: number }; dark: { L: number; C: number; h: number } };

const SURFACES: Record<MoodId, Surface> = {
  // Carta neutra: non prende parte, lascia parlare l'arcobaleno.
  spettro: { light: { L: 0.955, C: 0.004, h: 90 }, dark: { L: 0.235, C: 0.005, h: 90 } },
  // Grigio appena tiepido, per non spezzare la continuita' della sfumatura.
  flusso: { light: { L: 0.94, C: 0.008, h: 70 }, dark: { L: 0.245, C: 0.008, h: 70 } },
  // Il piu' chiaro e arioso: il mood che deve far respirare.
  quiete: { light: { L: 0.968, C: 0.006, h: 100 }, dark: { L: 0.27, C: 0.006, h: 100 } },
  // Molto chiaro o molto scuro, per massimizzare lo stacco col capo.
  carattere: { light: { L: 0.975, C: 0.002, h: 0 }, dark: { L: 0.185, C: 0.003, h: 0 } },
  // Sabbia: l'unico che si concede una temperatura riconoscibile.
  terra: { light: { L: 0.935, C: 0.018, h: 72 }, dark: { L: 0.26, C: 0.016, h: 62 } },
  // Grigio freddo e profondo.
  notte: { light: { L: 0.9, C: 0.006, h: 250 }, dark: { L: 0.21, C: 0.008, h: 250 } },
};

export const moodSurface = (mood: MoodId, dark: boolean): string =>
  oklchToHex(dark ? SURFACES[mood].dark : SURFACES[mood].light);
