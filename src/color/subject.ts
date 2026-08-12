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
 * Rende trasparente lo sfondo, con un riempimento che parte dai bordi.
 *
 * Non cancella "tutti i pixel simili allo sfondo" ma solo quelli che il bordo
 * puo' raggiungere: e' la differenza fra perdere il muro e perdere anche la
 * camicia bianca appesa davanti.
 *
 * Se il capo tocca tutto il perimetro il riempimento si mangia l'immagine
 * intera: e' il segnale che il rilevamento non aveva appigli, e chi chiama lo
 * riconosce da `opaqueShare`.
 */
export function cutOutBackground(buffer: PixelBuffer): PixelBuffer {
  const { width, height, data } = buffer;
  const output = new Uint8Array(data);
  if (width === 0 || height === 0) return { width, height, data: output };

  const background = borderColors(buffer);
  if (background.length === 0) return { width, height, data: output };

  const labAt = (index: number) =>
    rgbToOklab({ r: data[index * 4], g: data[index * 4 + 1], b: data[index * 4 + 2] });

  const visited = new Uint8Array(width * height);
  // Pila esplicita invece che ricorsione: su un'immagine grande una funzione
  // ricorsiva esaurirebbe lo stack.
  const stack: number[] = [];

  const push = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    if (isBackground(labAt(index), background)) stack.push(index);
  };

  for (let x = 0; x < width; x++) {
    push(x);
    push((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    push(y * width);
    push(y * width + width - 1);
  }

  while (stack.length > 0) {
    const index = stack.pop()!;
    output[index * 4 + 3] = 0;

    const x = index % width;
    const y = (index - x) / width;

    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (y > 0) push(index - width);
    if (y < height - 1) push(index + width);
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
