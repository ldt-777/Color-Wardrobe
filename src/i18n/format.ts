import type { Plural } from './translations';

/**
 * Formattazione delle stringhe tradotte.
 *
 * Sta in un modulo a parte perche' non tocca ne React ne i moduli nativi: cosi'
 * `npm test` puo' verificarla su Node, come il motore colore.
 */

/** Sostituisce i segnaposto `{nome}` con i valori passati. */
export function fill(template: string, values: Record<string, string | number>): string {
  // Un segnaposto senza valore resta scritto com'e' invece di diventare
  // "undefined": e' un buco evidente da correggere, non un errore silenzioso.
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

/** Sceglie singolare o plurale e inserisce il numero al posto di `{count}`. */
export const plural = (forms: Plural, count: number): string =>
  fill(count === 1 ? forms.one : forms.other, { count });
