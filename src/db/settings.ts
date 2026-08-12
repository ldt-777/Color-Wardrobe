import { LANGUAGES, type Language } from '../i18n/translations';
import { getDatabase } from './index';

export type AppSettings = {
  /** Mood fisso: quando e' impostato l'app apre sempre con quello. */
  pinnedMoodId: string | null;
  /** Vista "solo colore": le foto lasciano il posto ai colori pieni. */
  colorOnly: boolean;
  /** Lingua scelta a mano; `null` significa "come il telefono". */
  language: Language | null;
};

export const DEFAULT_SETTINGS: AppSettings = {
  pinnedMoodId: null,
  colorOnly: false,
  language: null,
};

/** Una lingua rimossa in futuro non deve bloccare l'avvio: torna a `null`. */
const readLanguage = (value: string | undefined): Language | null =>
  value && (LANGUAGES as readonly string[]).includes(value) ? (value as Language) : null;

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM app_settings');
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  return {
    pinnedMoodId: stored.get('pinnedMoodId') || null,
    colorOnly: stored.get('colorOnly') === 'true',
    language: readLanguage(stored.get('language')),
  };
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const db = await getDatabase();
  if (value === null) {
    await db.runAsync('DELETE FROM app_settings WHERE key = ?', key);
    return;
  }
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    key,
    String(value)
  );
}
