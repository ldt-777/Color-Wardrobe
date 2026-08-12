import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';

import { readPngPixels } from './decode';
import { encodePng } from './png';
import { quantizeImage, type Swatch } from './quantize';
import {
  cutOutBackground,
  detectSubjectBounds,
  opaqueShare,
  type NormalizedRect,
} from './subject';

/**
 * Larghezza a cui analizziamo la foto. 160px bastano: il clustering cerca le
 * grandi masse di colore, non il dettaglio, e su un'immagine piccola i pixel di
 * bordo (quelli mezzi capo e mezzi sfondo) pesano molto meno.
 */
const ANALYSIS_WIDTH = 160;
const STORED_WIDTH = 1280;
const THUMB_WIDTH = 480;

/**
 * Lo scontorno gira in JavaScript su ogni pixel, quindi la larghezza e' un
 * compromesso: 512px danno un bordo pulito sulla card senza far aspettare
 * l'utente piu' di un istante.
 */
const CUTOUT_WIDTH = 512;

/**
 * Se dopo lo scontorno resta quasi tutto o quasi niente, il rilevamento ha
 * sbagliato: meglio nessun ritaglio che un capo cancellato o uno sfondo intero
 * spacciato per capo.
 */
const MIN_OPAQUE = 0.05;
const MAX_OPAQUE = 0.97;

export type PreparedGarmentImage = {
  imageUri: string;
  thumbUri: string;
  /** PNG del capo scontornato, o `null` se lo scontorno non e' riuscito. */
  cutoutUri: string | null;
  swatches: Swatch[];
};

export type PrepareOptions = {
  /** Ritaglio da applicare, in coordinate 0..1. Assente significa foto intera. */
  crop?: NormalizedRect;
  /** Se togliere lo sfondo per la vista a griglia. */
  removeBackground?: boolean;
};

function garmentsDirectory(): Directory {
  const directory = new Directory(Paths.document, 'garments');
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Applica il ritaglio, se c'e', e restituisce l'immagine pronta in memoria. */
async function render(sourceUri: string, crop?: NormalizedRect): Promise<ImageRef> {
  const context = ImageManipulator.manipulate(sourceUri);
  const original = await context.renderAsync();
  if (!crop) return original;

  // Il rettangolo arriva normalizzato perche' e' stato scelto guardando
  // l'anteprima: qui torna in pixel sulla risoluzione vera.
  const rect = {
    originX: Math.round(crop.x * original.width),
    originY: Math.round(crop.y * original.height),
    width: Math.round(crop.width * original.width),
    height: Math.round(crop.height * original.height),
  };
  if (rect.width < 8 || rect.height < 8) return original;

  return context.crop(rect).renderAsync();
}

/** Ridimensiona senza mai ingrandire: allargare una foto non aggiunge colore. */
async function saveAt(sourceUri: string, width: number, format: SaveFormat, compress: number) {
  const context = ImageManipulator.manipulate(sourceUri);
  const original = await context.renderAsync();
  if (original.width <= width) return original.saveAsync({ format, compress });

  const resized = await context.resize({ width }).renderAsync();
  return resized.saveAsync({ format, compress });
}

/** `move` e' sincrono e non accetta un flag di sovrascrittura: la destinazione
 *  va liberata prima, altrimenti solleva. */
function moveInto(sourceUri: string, destination: File): string {
  if (destination.exists) destination.delete();
  new File(sourceUri).move(destination);
  return destination.uri;
}

/** Legge i pixel di un'immagine passando da un PNG temporaneo. */
async function pixelsAt(sourceUri: string, width: number) {
  const png = await saveAt(sourceUri, width, SaveFormat.PNG, 1);
  try {
    return await readPngPixels(png.uri);
  } finally {
    const temporary = new File(png.uri);
    if (temporary.exists) temporary.delete();
  }
}

/** Estrae la palette da una foto, senza salvare nulla di permanente. */
export async function extractSwatches(sourceUri: string): Promise<Swatch[]> {
  return quantizeImage(await pixelsAt(sourceUri, ANALYSIS_WIDTH));
}

/**
 * Propone il ritaglio attorno al capo. `null` se il capo riempie gia'
 * l'inquadratura o se non c'e' uno sfondo da cui distinguerlo.
 */
export async function suggestCrop(sourceUri: string): Promise<NormalizedRect | null> {
  return detectSubjectBounds(await pixelsAt(sourceUri, ANALYSIS_WIDTH));
}

async function writeCutout(sourceUri: string, destination: File): Promise<string | null> {
  const cut = cutOutBackground(await pixelsAt(sourceUri, CUTOUT_WIDTH));

  const opaque = opaqueShare(cut);
  if (opaque < MIN_OPAQUE || opaque > MAX_OPAQUE) return null;

  if (destination.exists) destination.delete();
  destination.create();
  destination.write(encodePng(cut));
  return destination.uri;
}

/**
 * Porta una foto appena scattata dentro l'app: copia permanente, miniatura,
 * scontorno e palette. La foto originale (cache della fotocamera o galleria)
 * resta intatta.
 */
export async function prepareGarmentImage(
  sourceUri: string,
  garmentId: string,
  options: PrepareOptions = {}
): Promise<PreparedGarmentImage> {
  const directory = garmentsDirectory();

  const cropped = await render(sourceUri, options.crop);
  const full = await cropped.saveAsync({ format: SaveFormat.JPEG, compress: 1 });
  const source = await saveAt(full.uri, STORED_WIDTH, SaveFormat.JPEG, 0.86);
  const imageUri = moveInto(source.uri, new File(directory, `${garmentId}.jpg`));

  const thumb = await saveAt(imageUri, THUMB_WIDTH, SaveFormat.JPEG, 0.7);
  const thumbUri = moveInto(thumb.uri, new File(directory, `${garmentId}-thumb.jpg`));

  const cutoutUri =
    options.removeBackground === false
      ? null
      : await writeCutout(imageUri, new File(directory, `${garmentId}-cutout.png`));

  return { imageUri, thumbUri, cutoutUri, swatches: await extractSwatches(imageUri) };
}

/** Rimuove i file di un capo eliminato, ignorando quelli gia' spariti. */
export function deleteGarmentImages(garmentId: string): void {
  const directory = garmentsDirectory();
  for (const name of [
    `${garmentId}.jpg`,
    `${garmentId}-thumb.jpg`,
    `${garmentId}-cutout.png`,
  ]) {
    const file = new File(directory, name);
    if (file.exists) file.delete();
  }
}
