import type { PixelBuffer } from './decode';
import { BACKGROUND_TOLERANCE, clusterPoints, collectSamples } from './quantize';
import { deltaE, rgbToOklab, type Oklab } from './space';

/**
 * Ritaglio e scontorno del capo.
 *
 * Entrambe le operazioni partono dalla stessa domanda gia' risolta dal
 * quantizzatore — quali colori sono sfondo — e la riusano: la' serve a non
 * far entrare il muro nella palette, qui a sapere dove finisce il capo.
 */

/** Rettangolo in coordinate 0..1, indipendente dalla risoluzione dell'immagine. */
export type NormalizedRect = { x: number; y: number; width: number; height: number };

export const FULL_FRAME: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };

/** Margine lasciato attorno al capo, in frazione del lato. */
const PADDING = 0.04;

/**
 * Una riga conta come occupata dal capo se almeno questa frazione dei suoi
 * pixel di primo piano e' presente. Serve a ignorare i pixel sparsi: un
 * riflesso o un granello di polvere non devono allargare il ritaglio.
 */
const OCCUPANCY = 0.06;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const isBackground = (lab: Oklab, background: Oklab[]) =>
  background.some((bg) => deltaE(lab, bg) < BACKGROUND_TOLERANCE);

/**
 * I colori della cornice esterna, senza chiedersi se siano anche al centro.
 *
 * Il quantizzatore quella domanda se la pone, altrimenti un capo che riempie
 * l'inquadratura sparirebbe dalla propria palette. Qui no, e in entrambi i casi
 * per lo stesso motivo: il capo e' gia' protetto da altro. Nel riempimento lo
 * protegge la connettivita', perche' i suoi pixel non si raggiungono dal bordo
 * senza attraversarlo; nel rilevamento del rettangolo lo protegge il fatto che
 * un capo a tutto campo lascia semplicemente la maschera vuota.
 *
 * Applicare quel filtro anche qui sarebbe anzi dannoso: un capo piccolo lascia
 * lo sfondo maggioritario perfino al centro dell'inquadratura, e verrebbe
 * scambiato per parte del soggetto.
 */
function borderColors(buffer: PixelBuffer): Oklab[] {
  const samples = collectSamples(buffer);
  if (samples.length === 0) return [];

  const marginX = buffer.width * 0.07;
  const marginY = buffer.height * 0.07;
  const border = samples.filter(
    (s) =>
      s.x < marginX ||
      s.x > buffer.width - marginX ||
      s.y < marginY ||
      s.y > buffer.height - marginY
  );
  if (border.length < 24) return [];

  return clusterPoints(
    border.map((s) => ({ lab: s.lab, weight: 1 })),
    2,
    10
  )
    .filter((candidate) => candidate.share >= 0.3)
    .map((candidate) => candidate.lab);
}

/** Maschera del primo piano: `true` dove c'e' il capo. */
function foregroundMask(buffer: PixelBuffer, background: Oklab[]): Uint8Array {
  const { width, height, data } = buffer;
  const mask = new Uint8Array(width * height);

  for (let i = 0, p = 0; p < mask.length; p++, i += 4) {
    if (data[i + 3] < 128) continue;
    const lab = rgbToOklab({ r: data[i], g: data[i + 1], b: data[i + 2] });
    mask[p] = isBackground(lab, background) ? 0 : 1;
  }

  return mask;
}

/** Primo e ultimo indice in cui il profilo supera la soglia di occupazione. */
function span(profile: number[], limit: number): [number, number] | null {
  const threshold = Math.max(1, limit * OCCUPANCY);
  let first = -1;
  let last = -1;

  for (let i = 0; i < profile.length; i++) {
    if (profile[i] >= threshold) {
      if (first < 0) first = i;
      last = i;
    }
  }

  return first < 0 ? null : [first, last];
}

/**
 * Il rettangolo che contiene il capo, o `null` se non c'e' uno sfondo
 * riconoscibile da cui distinguerlo.
 *
 * Lavora per profili di riga e colonna invece che sul rettangolo minimo dei
 * pixel accesi: cosi' un pixel isolato in un angolo non allarga il ritaglio a
 * tutta l'immagine.
 */
export function detectSubjectBounds(buffer: PixelBuffer): NormalizedRect | null {
  const { width, height } = buffer;
  if (width === 0 || height === 0) return null;

  const background = borderColors(buffer);
  if (background.length === 0) return null;

  const mask = foregroundMask(buffer, background);

  const columns = new Array<number>(width).fill(0);
  const rows = new Array<number>(height).fill(0);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        columns[x]++;
        rows[y]++;
      }
    }
  }

  const horizontal = span(columns, height);
  const vertical = span(rows, width);
  if (!horizontal || !vertical) return null;

  const left = clamp01(horizontal[0] / width - PADDING);
  const right = clamp01((horizontal[1] + 1) / width + PADDING);
  const top = clamp01(vertical[0] / height - PADDING);
  const bottom = clamp01((vertical[1] + 1) / height + PADDING);

  const rect = { x: left, y: top, width: right - left, height: bottom - top };

  // Se il capo occupa quasi tutto, ritagliare non aggiunge niente e rischia
  // solo di tagliare una manica: meglio lasciare l'inquadratura com'e'.
  return rect.width > 0.92 && rect.height > 0.92 ? null : rect;
}

/**
 * Sfondo previsto in ogni punto, interpolando fra i quattro angoli.
 *
 * Un solo colore di sfondo per tutta la foto non regge la realta': un muro ha
 * vignettatura, un tavolo ha il gradiente della luce che entra da una finestra.
 * Stimare il colore in ciascun angolo e interpolare fra i quattro segue quelle
 * variazioni lente, che sono esattamente quelle che una soglia fissa sbaglia.
 */
type BackgroundField = {
  corners: [Oklab, Oklab, Oklab, Oklab]; // alto-sx, alto-dx, basso-sx, basso-dx
  clusters: Oklab[];
};

function meanLab(labs: Oklab[], fallback: Oklab): Oklab {
  if (labs.length === 0) return fallback;
  const sum = labs.reduce(
    (acc, lab) => ({ L: acc.L + lab.L, a: acc.a + lab.a, b: acc.b + lab.b }),
    { L: 0, a: 0, b: 0 }
  );
  return { L: sum.L / labs.length, a: sum.a / labs.length, b: sum.b / labs.length };
}

function backgroundField(buffer: PixelBuffer, clusters: Oklab[]): BackgroundField {
  const samples = collectSamples(buffer);
  const marginX = buffer.width * 0.1;
  const marginY = buffer.height * 0.1;

  const onBorder = samples.filter(
    (s) =>
      s.x < marginX ||
      s.x > buffer.width - marginX ||
      s.y < marginY ||
      s.y > buffer.height - marginY
  );
  // Un capo che sborda dal bordo non deve entrare nella stima dello sfondo.
  const backgroundish = onBorder.filter((s) => isBackground(s.lab, clusters));
  const overall = meanLab(
    backgroundish.map((s) => s.lab),
    clusters[0]
  );

  const quadrant = (left: boolean, top: boolean) =>
    meanLab(
      backgroundish
        .filter(
          (s) =>
            (left ? s.x < buffer.width / 2 : s.x >= buffer.width / 2) &&
            (top ? s.y < buffer.height / 2 : s.y >= buffer.height / 2)
        )
        .map((s) => s.lab),
      overall
    );

  return {
    corners: [quadrant(true, true), quadrant(false, true), quadrant(true, false), quadrant(false, false)],
    clusters,
  };
}

/** Distanza dal colore che ci si aspetta in quel punto, o dai colori del bordo. */
function backgroundDistance(field: BackgroundField, lab: Oklab, u: number, v: number): number {
  const [topLeft, topRight, bottomLeft, bottomRight] = field.corners;
  const predicted = {
    L:
      (topLeft.L * (1 - u) + topRight.L * u) * (1 - v) +
      (bottomLeft.L * (1 - u) + bottomRight.L * u) * v,
    a:
      (topLeft.a * (1 - u) + topRight.a * u) * (1 - v) +
      (bottomLeft.a * (1 - u) + bottomRight.a * u) * v,
    b:
      (topLeft.b * (1 - u) + topRight.b * u) * (1 - v) +
      (bottomLeft.b * (1 - u) + bottomRight.b * u) * v,
  };

  // Anche lontano dalla previsione locale, un colore identico a una delle tinte
  // dominanti del bordo resta sfondo: copre gli sfondi a due tinte.
  return field.clusters.reduce(
    (best, cluster) => Math.min(best, deltaE(lab, cluster)),
    deltaE(lab, predicted)
  );
}

/** Sotto questa distanza il pixel e' sfondo con certezza. */
const CERTAIN = 0.05;
/** Sopra questa distanza e' capo con certezza; in mezzo, alfa parziale. */
const UNCERTAIN = 0.14;

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

/** Tiene solo la macchia opaca piu' grande, buttando le isole sparse. */
function keepLargestBlob(alpha: Uint8Array, width: number, height: number): void {
  const label = new Int32Array(alpha.length).fill(-1);
  const stack: number[] = [];
  let best = -1;
  let bestSize = 0;
  let current = 0;

  for (let seed = 0; seed < alpha.length; seed++) {
    if (alpha[seed] < 128 || label[seed] >= 0) continue;

    let size = 0;
    stack.push(seed);
    label[seed] = current;

    while (stack.length > 0) {
      const index = stack.pop()!;
      size++;
      const x = index % width;
      const y = (index - x) / width;

      const visit = (next: number) => {
        if (alpha[next] >= 128 && label[next] < 0) {
          label[next] = current;
          stack.push(next);
        }
      };

      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }

    if (size > bestSize) {
      bestSize = size;
      best = current;
    }
    current++;
  }

  if (best < 0) return;
  for (let i = 0; i < alpha.length; i++) {
    if (label[i] !== best) alpha[i] = 0;
  }
}

/** Media 3x3 sull'alfa: toglie la scalettatura senza spostare il contorno. */
function softenAlpha(alpha: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(alpha.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += alpha[ny * width + nx];
          count++;
        }
      }
      output[y * width + x] = Math.round(sum / count);
    }
  }

  return output;
}

/**
 * Rende trasparente lo sfondo.
 *
 * Quattro accorgimenti, ognuno contro un difetto preciso del taglio a soglia
 * secca: lo sfondo e' previsto punto per punto invece che con un colore solo,
 * cosi' ombre e vignettatura non diventano capo; fra le due soglie l'alfa e'
 * parziale, cosi' il contorno sfuma invece di scalettare; sopravvive solo la
 * macchia opaca piu' grande, cosi' un oggetto sul fondo non resta appeso
 * accanto al capo; e l'alfa viene ammorbidita, cosi' il bordo non taglia.
 *
 * Resta comunque un metodo cromatico: distingue per colore, non per forma. Su
 * fondi a fantasia o poco contrastati sbaglia, e il chiamante se ne accorge da
 * `opaqueShare`.
 */
export function cutOutBackground(buffer: PixelBuffer): PixelBuffer {
  const { width, height, data } = buffer;
  const output = new Uint8Array(data);
  if (width === 0 || height === 0) return { width, height, data: output };

  const clusters = borderColors(buffer);
  if (clusters.length === 0) return { width, height, data: output };

  const field = backgroundField(buffer, clusters);

  // La distanza serve due volte, e ricalcolarla costa piu' del tenerla.
  const distance = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const v = height > 1 ? y / (height - 1) : 0;
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const i = index * 4;
      distance[index] =
        data[i + 3] < 128
          ? 0
          : backgroundDistance(
              field,
              rgbToOklab({ r: data[i], g: data[i + 1], b: data[i + 2] }),
              width > 1 ? x / (width - 1) : 0,
              v
            );
    }
  }

  // Riempimento in due ondate. La prima avanza solo sui pixel certi, la seconda
  // sfuma nella fascia incerta: e' quest'ultima a dare il bordo morbido, e il
  // fatto che parta dalla prima impedisce che una zona interna di colore simile
  // allo sfondo venga bucata.
  const state = new Uint8Array(width * height); // 0 = capo, 1 = sfondo, 2 = fascia
  const flood = (limit: number, mark: number, seeds: number[]) => {
    const stack = seeds;
    while (stack.length > 0) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;

      const visit = (next: number) => {
        if (state[next] !== 0 || distance[next] >= limit) return;
        state[next] = mark;
        stack.push(next);
      };

      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }
  };

  const border: number[] = [];
  for (let x = 0; x < width; x++) {
    border.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    border.push(y * width, y * width + width - 1);
  }
  for (const index of border) {
    if (state[index] === 0 && distance[index] < CERTAIN) state[index] = 1;
  }

  flood(CERTAIN, 1, border.filter((index) => state[index] === 1));
  flood(
    UNCERTAIN,
    2,
    [...state.keys()].filter((index) => state[index] === 1)
  );

  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < alpha.length; index++) {
    if (state[index] === 1) alpha[index] = 0;
    else if (state[index] === 2) {
      const t = (distance[index] - CERTAIN) / (UNCERTAIN - CERTAIN);
      alpha[index] = Math.round(255 * smoothstep(t));
    } else alpha[index] = 255;
  }

  keepLargestBlob(alpha, width, height);
  const soft = softenAlpha(alpha, width, height);

  for (let index = 0; index < soft.length; index++) {
    output[index * 4 + 3] = Math.min(output[index * 4 + 3], soft[index]);
  }

  return { width, height, data: output };
}

/** Quanta parte dell'immagine e' rimasta opaca dopo lo scontorno, 0..1. */
export function opaqueShare(buffer: PixelBuffer): number {
  const total = buffer.width * buffer.height;
  if (total === 0) return 0;

  let opaque = 0;
  for (let i = 3; i < buffer.data.length; i += 4) {
    if (buffer.data[i] >= 128) opaque++;
  }
  return opaque / total;
}
