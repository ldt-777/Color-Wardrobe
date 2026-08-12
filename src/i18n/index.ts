import { getLocales } from 'expo-localization';

import { useWardrobe } from '../store/wardrobe';
import { DICTIONARIES, LANGUAGES, type Dictionary, type Language } from './translations';

export { fill, plural } from './format';
export {
  LANGUAGES,
  LANGUAGE_NAMES,
  type Dictionary,
  type Language,
} from './translations';

/** Lingua a cui ricadere quando il telefono ne parla una che non copriamo. */
const FALLBACK: Language = 'en';

const isSupported = (code: string): code is Language =>
  (LANGUAGES as readonly string[]).includes(code);

/**
 * La lingua del telefono, letta una volta sola.
 *
 * `getLocales()` tocca il modulo nativo, e la lingua di sistema non cambia
 * mentre l'app e' aperta senza che questa venga comunque riavviata.
 */
let deviceLanguage: Language | null = null;

function detectDeviceLanguage(): Language {
  if (deviceLanguage) return deviceLanguage;

  // I locali arrivano in ordine di preferenza: teniamo il primo che sappiamo
  // parlare, cosi' chi ha spagnolo come seconda lingua non finisce in inglese.
  for (const locale of getLocales()) {
    const code = locale.languageCode?.toLowerCase();
    if (code && isSupported(code)) {
      deviceLanguage = code;
      return code;
    }
  }

  deviceLanguage = FALLBACK;
  return FALLBACK;
}

/** `null` significa "come il telefono", ed e' il valore predefinito. */
export const resolveLanguage = (preference: Language | null): Language =>
  preference ?? detectDeviceLanguage();

/**
 * Le stringhe della lingua attiva.
 *
 * Restituisce il dizionario come oggetto invece che una funzione `t('chiave')`:
 * cosi' `t.wardrobe.title` e' verificato dal compilatore, e una chiave scritta
 * male non arriva a schermo come testo grezzo.
 */
export function useTranslation(): {
  t: Dictionary;
  language: Language;
  preference: Language | null;
} {
  const { settings } = useWardrobe();
  const language = resolveLanguage(settings.language);
  return { t: DICTIONARIES[language], language, preference: settings.language };
}
