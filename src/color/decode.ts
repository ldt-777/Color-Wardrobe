import { File } from 'expo-file-system';
import UPNG from 'upng-js';

export type PixelBuffer = {
  width: number;
  height: number;
  /** RGBA, 4 byte per pixel. */
  data: Uint8Array;
};

/**
 * Legge un PNG dal filesystem e ne restituisce i pixel RGBA.
 *
 * Passiamo dal PNG (e non dal JPEG) perche' e' senza perdita: gli artefatti di
 * compressione del JPEG inventerebbero colori sui bordi del capo, che poi il
 * clustering interpreterebbe come tinte vere.
 */
export async function readPngPixels(uri: string): Promise<PixelBuffer> {
  const bytes = await new File(uri).bytes();
  // Uint8Array puo' essere una vista parziale su un buffer piu' grande: UPNG
  // vuole un ArrayBuffer che inizi esattamente dai dati PNG.
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const image = UPNG.decode(buffer as ArrayBuffer);
  const rgba = UPNG.toRGBA8(image)[0];

  return {
    width: image.width,
    height: image.height,
    data: new Uint8Array(rgba),
  };
}
