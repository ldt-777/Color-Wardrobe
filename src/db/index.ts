import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'color-wardrobe.db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE garments (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    image_uri   TEXT NOT NULL,
    thumb_uri   TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );

  CREATE TABLE swatches (
    garment_id  TEXT NOT NULL,
    position    INTEGER NOT NULL,
    hex         TEXT NOT NULL,
    lightness   REAL NOT NULL,
    chroma      REAL NOT NULL,
    hue         REAL NOT NULL,
    share       REAL NOT NULL,
    role        TEXT NOT NULL,
    PRIMARY KEY (garment_id, position),
    FOREIGN KEY (garment_id) REFERENCES garments (id) ON DELETE CASCADE
  );

  CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE INDEX garments_created_at ON garments (created_at DESC);
  `,

  // Le categorie erano salvate come etichette italiane. Ora la colonna contiene
  // un identificatore stabile e il testo mostrato arriva dalle traduzioni:
  // qui convertiamo i capi gia' archiviati. L'ultima riga raccoglie qualsiasi
  // valore imprevisto invece di lasciare in giro categorie che nessuna lingua
  // sa piu' tradurre.
  `
  UPDATE garments SET category = 'knitwear'    WHERE category = 'Maglieria';
  UPDATE garments SET category = 'shirts'      WHERE category = 'Camicie';
  UPDATE garments SET category = 'tshirts'     WHERE category = 'T-shirt';
  UPDATE garments SET category = 'trousers'    WHERE category = 'Pantaloni';
  UPDATE garments SET category = 'jackets'     WHERE category = 'Giacche';
  UPDATE garments SET category = 'shoes'       WHERE category = 'Scarpe';
  UPDATE garments SET category = 'accessories' WHERE category = 'Accessori';
  UPDATE garments SET category = 'other'       WHERE category NOT IN (
    'knitwear', 'shirts', 'tshirts', 'trousers', 'jackets', 'shoes', 'accessories'
  );
  `,

  // Il PNG del capo scontornato. Ammette NULL: lo scontorno non riesce su ogni
  // foto, e i capi salvati prima di questa versione non ce l'hanno affatto.
  `ALTER TABLE garments ADD COLUMN cutout_uri TEXT;`,
];

let connection: Promise<SQLite.SQLiteDatabase> | null = null;

async function connect(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  // `user_version` tiene il conto delle migrazioni gia' applicate: aggiungere
  // uno schema futuro significa solo appendere una stringa a MIGRATIONS.
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  for (; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }

  return db;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  connection ??= connect();
  return connection;
}
