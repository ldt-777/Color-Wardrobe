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
 *
 * Nome e descrizione non stanno qui ma nelle traduzioni, indicizzati per `id`:
 * questo file descrive come si comporta un mood, non come lo si chiama.
 */
export const MOOD_IDS = [
  'spettro',
  'flusso',
  'quiete',
  'carattere',
  'terra',
  'notte',
] as const;

export type MoodId = (typeof MOOD_IDS)[number];

export type Mood = {
  id: MoodId;
  arrangement: ArrangementId;
  affinity: (stats: GarmentStats) => number;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const MOODS: Mood[] = [
  {
    id: 'spettro',
    arrangement: 'spettro',
    affinity: (s) => clamp01(0.25 + 0.75 * s.chroma),
  },
  {
    id: 'flusso',
    arrangement: 'flusso',
    affinity: (s) => clamp01(0.35 + 0.65 * (1 - s.rarity)),
  },
  {
    id: 'quiete',
    arrangement: 'quiete',
    affinity: (s) => clamp01(0.2 + 0.5 * (1 - s.chroma) + 0.3 * s.lightness),
  },
  {
    id: 'carattere',
    arrangement: 'contrasto',
    affinity: (s) => clamp01(0.15 + 0.5 * s.chroma + 0.35 * s.rarity),
  },
  {
    id: 'terra',
    arrangement: 'famiglie',
    affinity: (s) => clamp01(0.1 + 0.7 * s.warmth + 0.2 * (1 - Math.abs(s.chroma - 0.45) * 2)),
  },
  {
    id: 'notte',
    arrangement: 'profondita',
    affinity: (s) => clamp01(0.1 + 0.6 * (1 - s.lightness) + 0.3 * (s.neutral ? 1 : 0)),
  },
];

export const DEFAULT_MOOD_ID: MoodId = 'flusso';

export const findMood = (id: string | null | undefined): Mood =>
  MOODS.find((mood) => mood.id === id) ?? MOODS.find((mood) => mood.id === DEFAULT_MOOD_ID)!;
