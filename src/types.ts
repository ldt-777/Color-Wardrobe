import type { RankedSwatch } from './color/roles';

/**
 * Le categorie sono identificatori stabili, non etichette.
 *
 * Quello che finisce nel database e' `knitwear`; il testo che l'utente legge
 * ("Maglieria", "Knitwear", "Punto") arriva dalle traduzioni. Se salvassimo
 * l'etichetta, cambiare lingua renderebbe illeggibile il guardaroba gia'
 * archiviato.
 */
export const CATEGORIES = [
  'knitwear',
  'shirts',
  'tshirts',
  'trousers',
  'jackets',
  'shoes',
  'accessories',
  'other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = 'other';

export type Garment = {
  id: string;
  name: string;
  category: Category;
  imageUri: string;
  thumbUri: string;
  createdAt: number;
  swatches: RankedSwatch[];
};
