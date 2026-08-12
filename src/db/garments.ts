import { deleteGarmentImages } from '../color/extract';
import type { Swatch } from '../color/quantize';
import { rankSwatches, type RankedSwatch, type SwatchRole } from '../color/roles';
import { hexToOklab, oklabToOklch } from '../color/space';
import type { Category, Garment } from '../types';
import { getDatabase } from './index';

type GarmentRow = {
  id: string;
  name: string;
  category: string;
  image_uri: string;
  thumb_uri: string;
  cutout_uri: string | null;
  created_at: number;
};

type SwatchRow = {
  garment_id: string;
  position: number;
  hex: string;
  lightness: number;
  chroma: number;
  hue: number;
  share: number;
  role: string;
};

function toRankedSwatch(row: SwatchRow): RankedSwatch {
  const lab = hexToOklab(row.hex);
  return {
    hex: row.hex,
    lab,
    lch: { L: row.lightness, C: row.chroma, h: row.hue },
    share: row.share,
    role: row.role as SwatchRole,
    // La salience non viene persistita: e' derivabile dagli stessi dati, e
    // ricalcolarla evita che un cambio di formula lasci in giro valori vecchi.
    salience: 0,
  };
}

export async function listGarments(): Promise<Garment[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<GarmentRow>(
    'SELECT * FROM garments ORDER BY created_at DESC'
  );
  if (rows.length === 0) return [];

  const swatchRows = await db.getAllAsync<SwatchRow>(
    'SELECT * FROM swatches ORDER BY garment_id, position'
  );

  const byGarment = new Map<string, RankedSwatch[]>();
  for (const row of swatchRows) {
    const list = byGarment.get(row.garment_id);
    const swatch = toRankedSwatch(row);
    if (list) list.push(swatch);
    else byGarment.set(row.garment_id, [swatch]);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category as Category,
    imageUri: row.image_uri,
    thumbUri: row.thumb_uri,
    cutoutUri: row.cutout_uri,
    createdAt: row.created_at,
    swatches: rankSwatches(byGarment.get(row.id) ?? []),
  }));
}

export async function insertGarment(garment: {
  id: string;
  name: string;
  category: Category;
  imageUri: string;
  thumbUri: string;
  cutoutUri: string | null;
  swatches: Swatch[];
}): Promise<Garment> {
  const db = await getDatabase();
  const createdAt = Date.now();
  const ranked = rankSwatches(garment.swatches);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO garments (id, name, category, image_uri, thumb_uri, cutout_uri, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      garment.id,
      garment.name,
      garment.category,
      garment.imageUri,
      garment.thumbUri,
      garment.cutoutUri,
      createdAt
    );

    for (const [position, swatch] of ranked.entries()) {
      await db.runAsync(
        `INSERT INTO swatches (garment_id, position, hex, lightness, chroma, hue, share, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        garment.id,
        position,
        swatch.hex,
        swatch.lch.L,
        swatch.lch.C,
        swatch.lch.h,
        swatch.share,
        swatch.role
      );
    }
  });

  return {
    id: garment.id,
    name: garment.name,
    category: garment.category,
    imageUri: garment.imageUri,
    thumbUri: garment.thumbUri,
    cutoutUri: garment.cutoutUri,
    createdAt,
    swatches: ranked,
  };
}

export async function renameGarment(id: string, name: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE garments SET name = ? WHERE id = ?', name, id);
}

export async function deleteGarment(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM garments WHERE id = ?', id);
  deleteGarmentImages(id);
}

/** Ricostruisce lo swatch a partire da un hex, quando serve fuori dal DB. */
export const swatchFromHex = (hex: string, share: number): Swatch => {
  const lab = hexToOklab(hex);
  return { hex, lab, lch: oklabToOklch(lab), share };
};
