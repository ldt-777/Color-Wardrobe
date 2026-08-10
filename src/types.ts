import type { RankedSwatch } from './color/roles';

export const CATEGORIES = [
  'Maglieria',
  'Camicie',
  'T-shirt',
  'Pantaloni',
  'Giacche',
  'Scarpe',
  'Accessori',
  'Altro',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Garment = {
  id: string;
  name: string;
  category: Category;
  imageUri: string;
  thumbUri: string;
  createdAt: number;
  swatches: RankedSwatch[];
};
