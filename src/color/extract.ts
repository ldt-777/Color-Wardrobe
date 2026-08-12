import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { readPngPixels } from './decode';
import { quantizeImage, type Swatch } from './quantize';

/**
 * Larghezza a cui analizziamo la foto. 160px bastano: il clustering cerca le
 * grandi masse di colore, non il dettaglio, e su un'immagine piccola i pixel di
 * bordo (quelli mezzi capo e mezzi sfondo) pesano molto meno.
 */
const ANALYSIS_WIDTH = 160;
const STORED_WIDTH = 1280;
const THUMB_WIDTH = 480;

export type PreparedGarmentImage = {
  imageUri: string;
  thumbUri: string;
  swatches: Swatch[];
};

function garmentsDirectory(): Directory {
  const directory = new Directory(Paths.document, 'garments');
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Ridimensiona senza mai ingrandire: allargare una foto non aggiunge colore. */
async function resizeTo(sourceUri: string, width: number, format: SaveFormat, compress: number) {
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

/** Estrae la palette da una foto, senza salvare nulla di permanente. */
export async function extractSwatches(sourceUri: string): Promise<Swatch[]> {
  const analysis = await resizeTo(sourceUri, ANALYSIS_WIDTH, SaveFormat.PNG, 1);
  try {
    return quantizeImage(await readPngPixels(analysis.uri));
  } finally {
    const temporary = new File(analysis.uri);
    if (temporary.exists) temporary.delete();
  }
}

/**
 * Porta una foto appena scattata dentro l'app: copia permanente, miniatura e
 * palette. La foto originale (cache della fotocamera o galleria) resta intatta.
 */
export async function prepareGarmentImage(
  sourceUri: string,
  garmentId: string
): Promise<PreparedGarmentImage> {
  const directory = garmentsDirectory();

  const full = await resizeTo(sourceUri, STORED_WIDTH, SaveFormat.JPEG, 0.86);
  const imageUri = moveInto(full.uri, new File(directory, `${garmentId}.jpg`));

  const thumb = await resizeTo(imageUri, THUMB_WIDTH, SaveFormat.JPEG, 0.7);
  const thumbUri = moveInto(thumb.uri, new File(directory, `${garmentId}-thumb.jpg`));

  return { imageUri, thumbUri, swatches: await extractSwatches(imageUri) };
}

/** Rimuove i file di un capo eliminato, ignorando quelli gia' spariti. */
export function deleteGarmentImages(garmentId: string): void {
  const directory = garmentsDirectory();
  for (const name of [`${garmentId}.jpg`, `${garmentId}-thumb.jpg`]) {
    const file = new File(directory, name);
    if (file.exists) file.delete();
  }
}
