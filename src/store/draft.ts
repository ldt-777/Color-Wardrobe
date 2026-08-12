/**
 * La foto in lavorazione fra lo scatto e il salvataggio.
 *
 * Contiene solo l'originale: ritaglio, scontorno e palette si calcolano nella
 * schermata di revisione, quando l'utente ha deciso l'inquadratura. Elaborare
 * prima significherebbe rifare tutto al primo ritocco.
 *
 * Sta in un modulo invece che nei parametri di navigazione perche' le
 * dimensioni servono ai calcoli del ritaglio, e passarle come stringhe
 * nell'URL vorrebbe dire riparsarle a ogni transizione.
 */
export type GarmentDraft = {
  id: string;
  sourceUri: string;
  width: number;
  height: number;
};

let draft: GarmentDraft | null = null;

export const setDraft = (value: GarmentDraft | null) => {
  draft = value;
};

export const getDraft = () => draft;
