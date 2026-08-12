import UPNG from 'upng-js';

import type { PixelBuffer } from './decode';

/**
 * Codifica pixel RGBA in un PNG.
 *
 * Il PNG e' l'unico formato che l'app puo' scrivere per lo scontorno: serve un
 * canale alfa, e il JPEG non ce l'ha. Il parametro `0` chiede a UPNG la
 * codifica senza perdita, cosi' i bordi del capo non si sporcano.
 */
export function encodePng(buffer: PixelBuffer): Uint8Array {
  const rgba = buffer.data.buffer.slice(
    buffer.data.byteOffset,
    buffer.data.byteOffset + buffer.data.byteLength
  );

  const png = UPNG.encode([rgba as ArrayBuffer], buffer.width, buffer.height, 0);
  return new Uint8Array(png);
}
