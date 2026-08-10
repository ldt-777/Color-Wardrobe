import type { Swatch } from '../color/quantize';

/**
 * Il capo in lavorazione fra lo scatto e il salvataggio.
 *
 * Sta in un modulo invece che nei parametri di navigazione perche' contiene una
 * palette gia' calcolata: passarla come stringa nell'URL significherebbe
 * serializzarla e riparsarla a ogni transizione.
 */
export type GarmentDraft = {
  id: string;
  sourceUri: string;
  imageUri: string;
  thumbUri: string;
  swatches: Swatch[];
};

let draft: GarmentDraft | null = null;

export const setDraft = (value: GarmentDraft | null) => {
  draft = value;
};

export const getDraft = () => draft;
