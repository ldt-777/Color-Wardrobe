import type { ArrangementId } from './arrange';
import type { GarmentStats } from './roles';

/**
 * Un mood e' due cose insieme:
 *  - `arrangement`: come i capi vengono messi in fila nella griglia;
 *  - `affinity`:    quanto ogni singolo capo appartiene a quel mood, 0..1.
 *
 * L'ordine viene dal primo, il risalto visivo (quali capi emergono e quali
 * restano sullo sfondo) dal secondo. Cosi' cambiare mood non e' un filtro che
 * nasconde roba: e' lo stesso guardaroba raccontato in un altro modo.
 */
export type Mood = {
  id: string;
  name: string;
  tagline: string;
  arrangement: ArrangementId;
  affinity: (stats: GarmentStats) => number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const MOODS: Mood[] = [
  {
    id: 'spettro',
    name: 'Spettro',
    tagline: 'Il tuo guardaroba come un arcobaleno',
    arrangement: 'spettro',
    affinity: (s) => clamp01(0.25 + 0.75 * s.chroma),
  },
  {
    id: 'flusso',
    name: 'Flusso',
    tagline: 'Una sfumatura continua, senza salti',
    arrangement: 'flusso',
    affinity: (s) => clamp01(0.35 + 0.65 * (1 - s.rarity)),
  },
  {
    id: 'quiete',
    name: 'Quiete',
    tagline: 'Toni bassi, tutto respira',
    arrangement: 'quiete',
    affinity: (s) => clamp01(0.2 + 0.5 * (1 - s.chroma) + 0.3 * s.lightness),
  },
  {
    id: 'carattere',
    name: 'Carattere',
    tagline: 'I pezzi che si fanno notare, uno accanto all altro',
    arrangement: 'contrasto',
    affinity: (s) => clamp01(0.15 + 0.5 * s.chroma + 0.35 * s.rarity),
  },
  {
    id: 'terra',
    name: 'Terra',
    tagline: 'Caldi, naturali, vissuti',
    arrangement: 'famiglie',
    affinity: (s) => clamp01(0.1 + 0.7 * s.warmth + 0.2 * (1 - Math.abs(s.chroma - 0.45) * 2)),
  },
  {
    id: 'notte',
    name: 'Notte',
    tagline: 'Profondita, neutri, poca luce',
    arrangement: 'profondita',
    affinity: (s) => clamp01(0.1 + 0.6 * (1 - s.lightness) + 0.3 * (s.neutral ? 1 : 0)),
  },
];

export const DEFAULT_MOOD_ID = 'flusso';

export const findMood = (id: string | null | undefined): Mood =>
  MOODS.find((mood) => mood.id === id) ?? MOODS.find((mood) => mood.id === DEFAULT_MOOD_ID)!;
