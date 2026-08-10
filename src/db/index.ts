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
