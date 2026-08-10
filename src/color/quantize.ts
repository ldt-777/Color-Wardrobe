import type { PixelBuffer } from './decode';
import {
  deltaE,
  oklabToHex,
  oklabToOklch,
  rgbToOklab,
  type Oklab,
  type Oklch,
} from './space';

export type Swatch = {
  hex: string;
  lab: Oklab;
  lch: Oklch;
  /** Quota dell'immagine occupata da questo colore, 0..1. */
  share: number;
};

export type WeightedPoint = { lab: Oklab; weight: number };

/** Oltre questa soglia il clustering diventa lento senza guadagnare precisione. */
const MAX_SAMPLES = 9000;
/** Due centroidi piu' vicini di cosi' sono lo stesso colore per l'occhio. */
const MERGE_DISTANCE = 0.055;
/** Sotto questa quota lo swatch e' rumore (bordi, ombre, riflessi). */
const MIN_SHARE = 0.02;

// --- k-means pesato in OKLab ------------------------------------------------

function nearestCentroid(point: Oklab, centroids: Oklab[]): { index: number; distance: number } {
  let index = 0;
  let best = Infinity;
  for (let i = 0; i < centroids.length; i++) {
    const d = deltaE(point, centroids[i]);
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return { index, distance: best };
}

/**
 * Inizializzazione k-means++: il primo centro e' il punto piu' pesante, i
 * successivi sono estratti con probabilita' proporzionale alla distanza dal
 * centro piu' vicino. Evita che due centroidi nascano sullo stesso colore.
 */
function seedCentroids(points: WeightedPoint[], k: number): Oklab[] {
  const first = points.reduce((a, b) => (b.weight > a.weight ? b : a));
  const centroids: Oklab[] = [first.lab];

  while (centroids.length < k) {
    let total = 0;
    const scores = points.map((p) => {
      const d = nearestCentroid(p.lab, centroids).distance;
      const score = d * d * p.weight;
      total += score;
      return score;
    });

    if (total <= 0) break;

    let target = Math.random() * total;
    let picked = points.length - 1;
    for (let i = 0; i < scores.length; i++) {
      target -= scores[i];
      if (target <= 0) {
        picked = i;
        break;
      }
    }
    centroids.push(points[picked].lab);
  }

  return centroids;
}

export function clusterPoints(points: WeightedPoint[], k: number, iterations = 16): Swatch[] {
  if (points.length === 0) return [];

  const clusterCount = Math.max(1, Math.min(k, points.length));
  let centroids = seedCentroids(points, clusterCount);

  const sums = centroids.map(() => ({ L: 0, a: 0, b: 0, weight: 0 }));

  for (let iteration = 0; iteration < iterations; iteration++) {
    for (const sum of sums) {
      sum.L = sum.a = sum.b = sum.weight = 0;
    }

    for (const point of points) {
      const { index } = nearestCentroid(point.lab, centroids);
      const sum = sums[index];
      sum.L += point.lab.L * point.weight;
      sum.a += point.lab.a * point.weight;
      sum.b += point.lab.b * point.weight;
      sum.weight += point.weight;
    }

    let moved = 0;
    const next = centroids.map((centroid, i) => {
      const sum = sums[i];
      if (sum.weight === 0) return centroid; // cluster vuoto: lo lasciamo dov'e'
      const candidate = { L: sum.L / sum.weight, a: sum.a / sum.weight, b: sum.b / sum.weight };
      moved = Math.max(moved, deltaE(candidate, centroid));
      return candidate;
    });

    centroids = next;
    if (moved < 1e-4) break; // convergenza: continuare non cambia nulla
  }

  const totalWeight = points.reduce((acc, p) => acc + p.weight, 0);
  const clusters = centroids
    .map((lab, i) => ({ lab, weight: sums[i].weight }))
    .filter((c) => c.weight > 0);

  return finalizeClusters(clusters, totalWeight);
}

function finalizeClusters(
  clusters: { lab: Oklab; weight: number }[],
  totalWeight: number
): Swatch[] {
  const merged: { lab: Oklab; weight: number }[] = [];

  for (const cluster of [...clusters].sort((a, b) => b.weight - a.weight)) {
    const twin = merged.find((m) => deltaE(m.lab, cluster.lab) < MERGE_DISTANCE);
    if (!twin) {
      merged.push({ ...cluster });
      continue;
    }
    // Media pesata dei due centroidi, cosi' il colore risultante resta quello
    // che l'occhio vede come "medio" e non quello del cluster piu' fortunato.
    const w = twin.weight + cluster.weight;
    twin.lab = {
      L: (twin.lab.L * twin.weight + cluster.lab.L * cluster.weight) / w,
      a: (twin.lab.a * twin.weight + cluster.lab.a * cluster.weight) / w,
      b: (twin.lab.b * twin.weight + cluster.lab.b * cluster.weight) / w,
    };
    twin.weight = w;
  }

  const kept = merged.filter((c) => c.weight / totalWeight >= MIN_SHARE);
  const pool = kept.length > 0 ? kept : merged.slice(0, 1);
  const keptWeight = pool.reduce((acc, c) => acc + c.weight, 0) || 1;

  return pool
    .map((cluster) => ({
      hex: oklabToHex(cluster.lab),
      lab: cluster.lab,
      lch: oklabToOklch(cluster.lab),
      share: cluster.weight / keptWeight,
    }))
    .sort((a, b) => b.share - a.share);
}

// --- campionamento dell'immagine -------------------------------------------

type Sample = WeightedPoint & { x: number; y: number };

function collectSamples(buffer: PixelBuffer): Sample[] {
  const { width, height, data } = buffer;
  const total = width * height;
  const stride = Math.max(1, Math.round(Math.sqrt(total / MAX_SAMPLES)));
  const samples: Sample[] = [];

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 128) continue; // pixel trasparente

      samples.push({
        lab: rgbToOklab({ r: data[i], g: data[i + 1], b: data[i + 2] }),
        weight: 1,
        x,
        y,
      });
    }
  }

  return samples;
}

/**
 * Peso "attenzione": il capo sta al centro dell'inquadratura, quindi i pixel
 * centrali contano piu' di quelli ai margini. E' una gaussiana morbida, non un
 * ritaglio netto, cosi' maniche e orli non spariscono.
 */
function centerWeight(x: number, y: number, width: number, height: number): number {
  const dx = width > 1 ? (x / (width - 1) - 0.5) * 2 : 0;
  const dy = height > 1 ? (y / (height - 1) - 0.5) * 2 : 0;
  const sigma = 0.62;
  return Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
}

/**
 * Individua i colori dello sfondo guardando la cornice esterna dell'immagine.
 *
 * Il vincolo importante e' l'ultimo controllo: un colore del bordo viene
 * considerato sfondo solo se non e' anche il colore del centro. Senza quel
 * controllo, un capo che riempie tutta l'inquadratura verrebbe scambiato per
 * sfondo e cancellato dalla propria palette.
 */
function detectBackground(samples: Sample[], width: number, height: number): Oklab[] {
  const marginX = width * 0.07;
  const marginY = height * 0.07;
  const border = samples.filter(
    (s) => s.x < marginX || s.x > width - marginX || s.y < marginY || s.y > height - marginY
  );
  if (border.length < 24) return [];

  const core = samples.filter(
    (s) =>
      s.x > width * 0.25 && s.x < width * 0.75 && s.y > height * 0.25 && s.y < height * 0.75
  );
  if (core.length === 0) return [];

  const candidates = clusterPoints(
    border.map((s) => ({ lab: s.lab, weight: 1 })),
    2,
    10
  );

  return candidates
    .filter((candidate) => {
      if (candidate.share < 0.3) return false;
      const inCore = core.filter((s) => deltaE(s.lab, candidate.lab) < 0.1).length / core.length;
      return inCore < 0.3;
    })
    .map((candidate) => candidate.lab);
}

/**
 * Palette di un singolo capo a partire dai pixel della sua foto.
 */
export function quantizeImage(buffer: PixelBuffer, k = 6): Swatch[] {
  const samples = collectSamples(buffer);
  if (samples.length === 0) return [];

  const background = detectBackground(samples, buffer.width, buffer.height);

  const points: WeightedPoint[] = samples.map((sample) => {
    let weight = centerWeight(sample.x, sample.y, buffer.width, buffer.height);
    if (background.some((bg) => deltaE(sample.lab, bg) < 0.1)) weight *= 0.08;
    return { lab: sample.lab, weight };
  });

  const usable = points.filter((p) => p.weight > 1e-3);
  return clusterPoints(usable.length >= 32 ? usable : points, k);
}
