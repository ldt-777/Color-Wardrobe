declare module 'upng-js' {
  export type UPNGImage = {
    width: number;
    height: number;
    depth: number;
    ctype: number;
    frames: unknown[];
    tabs: Record<string, unknown>;
    data: Uint8Array;
  };

  export function decode(buffer: ArrayBuffer): UPNGImage;
  export function toRGBA8(image: UPNGImage): ArrayBuffer[];
  export function encode(
    frames: ArrayBuffer[],
    width: number,
    height: number,
    colors: number
  ): ArrayBuffer;

  const UPNG: {
    decode: typeof decode;
    toRGBA8: typeof toRGBA8;
    encode: typeof encode;
  };
  export default UPNG;
}
