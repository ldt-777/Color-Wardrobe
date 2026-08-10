import type { GarmentStats } from './roles';
import { deltaE, isNeutral, oklchToOklab, type Oklch } from './space';

export type ArrangementId =
  | 'spettro'
  | 'flusso'
  | 'quiete'
  | 'contrasto'
  | 'famiglie'
  | 'profondita';

export type Arrangeable = {
  id: string;
  signature: Oklch;
  stats: GarmentStats;
};

/**
 * Percorso goloso: si parte da un capo e ogni volta si prende quello
 * percettivamente piu' vicino (o piu' lontano) fra quelli rimasti.
 *
 * E' un'euristica sul problema del commesso viaggiatore: non da' l'ottimo, ma
 * su qualche centinaio di capi produce una sequenza senza salti visibili in
 * pochi millisecondi. Proviamo alcune partenze diverse e teniamo la migliore.
 */
function greedyPath(items: Arrangeable[], direction: 'near' | 'far'): Arrangeable[] {
  if (items.length <= 2) return items;

  const labs = items.map((item) => oklchToOklab(item.signature));
  const startCandidates = pickStarts(items, direction);

  let bestOrder: number[] = [];
  let bestCost = direction === 'near' ? Infinity : -Infinity;

  for (const start of startCandidates) {
    const visited = new Array(items.length).fill(false);
    const order = [start];
    visited[start] = true;
    let cost = 0;
    let current = start;

    for (let step = 1; step < items.length; step++) {
      let chosen = -1;
      let chosenDistance = direction === 'near' ? Infinity : -Infinity;

      for (let i = 0; i < items.length; i++) {
        if (visited[i]) continue;
        const d = deltaE(labs[current], labs[i]);
        const better = direction === 'near' ? d < chosenDistance : d > chosenDistance;
        if (better) {
          chosenDistance = d;
          chosen = i;
        }
      }

      visited[chosen] = true;
      order.push(chosen);
      cost += chosenDistance;
      current = chosen;
    }

    const better = direction === 'near' ? cost < bestCost : cost > bestCost;
    if (better) {
      bestCost = cost;
      bestOrder = order;
    }
  }

  return bestOrder.map((index) => items[index]);
}

/** Poche partenze ben scelte bastano: le prendiamo agli estremi di luminosita'. */
function pickStarts(items: Arrangeable[], direction: 'near' | 'far'): number[] {
  const byLightness = items
    .map((item, index) => ({ index, L: item.signature.L }))
    .sort((a, b) => a.L - b.L);

  const candidates = new Set<number>([
    byLightness[0].index,
    byLightness[byLightness.length - 1].index,
    byLightness[Math.floor(byLightness.length / 2)].index,
  ]);

  if (direction === 'far') {
    candidates.add(byLightness[Math.floor(byLightness.length / 4)].index);
  }

  return [...candidates];
}

function splitNeutrals(items: Arrangeable[]) {
  return {
    chromatic: items.filter((item) => !isNeutral(item.signature)),
    neutrals: items.filter((item) => isNeutral(item.signature)),
  };
}

/** Neutri dal piu' chiaro al piu' scuro: fanno da coda tranquilla alla griglia. */
const byLightnessDesc = (a: Arrangeable, b: Arrangeable) => b.signature.L - a.signature.L;

const arrangements: Record<ArrangementId, (items: Arrangeable[]) => Arrangeable[]> = {
  /** Giro completo della ruota cromatica: l'arcobaleno del guardaroba. */
  spettro: (items) => {
    const { chromatic, neutrals } = splitNeutrals(items);
    chromatic.sort((a, b) => a.signature.h - b.signature.h || b.signature.L - a.signature.L);
    neutrals.sort(byLightnessDesc);
    return [...chromatic, ...neutrals];
  },

  /** Sfumatura continua: ogni capo e' il piu' vicino possibile al precedente. */
  flusso: (items) => greedyPath(items, 'near'),

  /** Prima i toni bassi e polverosi, poi via via i piu' accesi. */
  quiete: (items) =>
    [...items].sort(
      (a, b) => a.signature.C - b.signature.C || b.signature.L - a.signature.L
    ),

  /** Accostamenti massimi: ogni capo stacca dal vicino. */
  contrasto: (items) => greedyPath(items, 'far'),

  /** Blocchi per famiglia di tinta, famiglie ordinate dalla piu' numerosa. */
  famiglie: (items) => {
    const { chromatic, neutrals } = splitNeutrals(items);
    const buckets = new Map<number, Arrangeable[]>();

    for (const item of chromatic) {
      const bucket = Math.floor(item.signature.h / 30) % 12;
      const list = buckets.get(bucket);
      if (list) list.push(item);
      else buckets.set(bucket, [item]);
    }

    const ordered = [...buckets.entries()]
      .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
      .flatMap(([, list]) => list.sort(byLightnessDesc));

    neutrals.sort(byLightnessDesc);
    return [...ordered, ...neutrals];
  },

  /** Dal piu' scuro al piu' chiaro. */
  profondita: (items) => [...items].sort((a, b) => a.signature.L - b.signature.L),
};

export function arrangeGarments(items: Arrangeable[], arrangement: ArrangementId): Arrangeable[] {
  if (items.length <= 1) return items;
  return arrangements[arrangement](items);
}
