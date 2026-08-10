import { harmonyScore, HARMONY_THRESHOLD } from './harmony';
import { clusterPoints, type Swatch } from './quantize';
import { isNeutral, warmth, type Oklch } from './space';

export type SwatchRole = 'base' | 'secondario' | 'accento' | 'neutro';

export type RankedSwatch = Swatch & {
  role: SwatchRole;
  /** Quanto lo swatch "si fa vedere": superficie corretta dalla saturazione. */
  salience: number;
};

/** Croma oltre la quale un colore e' pienamente saturo, per normalizzare. */
const CHROMA_CEILING = 0.22;

function salienceOf(swatch: Swatch): number {
  const saturation = Math.min(swatch.lch.C, CHROMA_CEILING) / CHROMA_CEILING;
  // L'esponente < 1 comprime la superficie: un accento piccolo ma acceso non
  // deve sparire dietro a un fondo grande e spento.
  return Math.pow(swatch.share, 0.65) * (0.32 + 0.68 * saturation);
}

/**
 * Assegna un ruolo a ogni colore del capo. E' la prioritizzazione "nel contesto
 * del singolo capo": stessa palette, ma sappiamo qual e' il colore che definisce
 * il capo e quali lo accompagnano.
 */
export function rankSwatches(swatches: Swatch[]): RankedSwatch[] {
  if (swatches.length === 0) return [];

  const byShare = [...swatches].sort((a, b) => b.share - a.share);
  const dominant = byShare[0];

  return byShare
    .map((swatch) => {
      let role: SwatchRole;
      if (swatch === dominant) role = 'base';
      else if (isNeutral(swatch.lch)) role = 'neutro';
      else if (swatch.share >= 0.15) role = 'secondario';
      else role = 'accento';

      return { ...swatch, role, salience: salienceOf(swatch) };
    })
    .sort((a, b) => b.salience - a.salience);
}

/** Il colore con cui il capo si presenta nella griglia. */
export function signatureSwatch(ranked: RankedSwatch[]): RankedSwatch | null {
  return ranked.length > 0 ? ranked[0] : null;
}

export type GarmentStats = {
  /** Indice della famiglia cromatica del guardaroba a cui il capo appartiene. */
  familyIndex: number;
  /** Peso di quella famiglia sul totale del guardaroba, 0..1. */
  familyShare: number;
  /** Quanti altri capi ci si abbinano, 0..1. */
  versatility: number;
  /** Quanto il capo e' un pezzo raro rispetto al resto del guardaroba, 0..1. */
  rarity: number;
  chroma: number;
  lightness: number;
  warmth: number;
  neutral: boolean;
};

export type WardrobeItem = {
  id: string;
  signature: Oklch;
};

export type WardrobeContext = {
  /** Le grandi famiglie di colore che compongono il guardaroba. */
  families: Swatch[];
  stats: Map<string, GarmentStats>;
};

const FAMILY_COUNT = 8;

/**
 * Legge il guardaroba nel suo insieme e ne ricava, per ogni capo, il ruolo che
 * ha rispetto agli altri. E' la seconda meta' della prioritizzazione: lo stesso
 * maglione blu e' un "pilastro" in un guardaroba di neutri e un "pezzo raro" in
 * uno tutto rosso.
 */
export function buildWardrobeContext(items: WardrobeItem[]): WardrobeContext {
  const stats = new Map<string, GarmentStats>();
  if (items.length === 0) return { families: [], stats };

  const families = clusterPoints(
    items.map((item) => ({ lab: oklchToLabPoint(item.signature), weight: 1 })),
    Math.min(FAMILY_COUNT, items.length)
  );

  const maxFamilyShare = families.reduce((max, f) => Math.max(max, f.share), 0) || 1;

  for (const item of items) {
    const familyIndex = nearestFamilyIndex(item.signature, families);
    const familyShare = families[familyIndex]?.share ?? 0;

    let matches = 0;
    for (const other of items) {
      if (other.id === item.id) continue;
      if (harmonyScore(item.signature, other.signature) >= HARMONY_THRESHOLD) matches++;
    }

    stats.set(item.id, {
      familyIndex,
      familyShare,
      versatility: items.length > 1 ? matches / (items.length - 1) : 0.5,
      rarity: 1 - familyShare / maxFamilyShare,
      chroma: Math.min(item.signature.C, CHROMA_CEILING) / CHROMA_CEILING,
      lightness: item.signature.L,
      warmth: warmth(item.signature),
      neutral: isNeutral(item.signature),
    });
  }

  return { families, stats };
}

function oklchToLabPoint(lch: Oklch) {
  const rad = (lch.h * Math.PI) / 180;
  return { L: lch.L, a: Math.cos(rad) * lch.C, b: Math.sin(rad) * lch.C };
}

function nearestFamilyIndex(signature: Oklch, families: Swatch[]): number {
  const lab = oklchToLabPoint(signature);
  let best = 0;
  let bestDistance = Infinity;
  families.forEach((family, index) => {
    const d =
      Math.pow(family.lab.L - lab.L, 2) +
      Math.pow(family.lab.a - lab.a, 2) +
      Math.pow(family.lab.b - lab.b, 2);
    if (d < bestDistance) {
      bestDistance = d;
      best = index;
    }
  });
  return best;
}
