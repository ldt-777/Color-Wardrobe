/**
 * Banco di prova delle traduzioni.
 *
 * Il compilatore garantisce gia' che ogni lingua abbia tutte le chiavi: qui
 * verifichiamo le cose che i tipi non vedono, cioe' che nessuna stringa sia
 * rimasta vuota o non tradotta, e che i segnaposto combacino fra le lingue.
 * Un `{count}` dimenticato nella traduzione spagnola compila benissimo e poi
 * mostra "prendas" senza numero.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fill, plural } from './format';
import { DICTIONARIES, LANGUAGES, LANGUAGE_NAMES, type Language } from './translations';

type Leaf = { path: string; value: string };

/** Appiattisce il dizionario in coppie `percorso -> stringa`. */
function flatten(node: unknown, prefix = ''): Leaf[] {
  if (typeof node === 'string') return [{ path: prefix, value: node }];
  if (node === null || typeof node !== 'object') return [];

  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    flatten(value, prefix ? `${prefix}.${key}` : key)
  );
}

const placeholdersOf = (value: string): string[] =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

const REFERENCE: Language = 'it';
const reference = flatten(DICTIONARIES[REFERENCE]);
const byPath = (language: Language) =>
  new Map(flatten(DICTIONARIES[language]).map((leaf) => [leaf.path, leaf.value]));

describe('dizionari', () => {
  it('copre tutte le lingue dichiarate', () => {
    for (const language of LANGUAGES) {
      assert.ok(DICTIONARIES[language], `manca il dizionario ${language}`);
      assert.ok(LANGUAGE_NAMES[language], `manca il nome della lingua ${language}`);
    }
  });

  it('non contiene stringhe vuote', () => {
    for (const language of LANGUAGES) {
      for (const leaf of flatten(DICTIONARIES[language])) {
        assert.ok(leaf.value.trim().length > 0, `${language}.${leaf.path} e vuota`);
      }
    }
  });

  for (const language of LANGUAGES.filter((code) => code !== REFERENCE)) {
    it(`"${language}" ha le stesse chiavi dell italiano`, () => {
      const other = flatten(DICTIONARIES[language]);
      assert.deepEqual(
        other.map((leaf) => leaf.path).sort(),
        reference.map((leaf) => leaf.path).sort()
      );
    });

    it(`"${language}" conserva gli stessi segnaposto`, () => {
      const translated = byPath(language);
      for (const leaf of reference) {
        assert.deepEqual(
          placeholdersOf(translated.get(leaf.path) ?? ''),
          placeholdersOf(leaf.value),
          `segnaposto diversi in ${language}.${leaf.path}`
        );
      }
    });

    it(`"${language}" e davvero tradotto`, () => {
      const translated = byPath(language);
      // Qualche voce coincide legittimamente fra lingue affini ("T-shirt" resta
      // "T-shirt"): quello che non deve succedere e' che una lingua sia stata
      // copiata dall'italiano e mai tradotta davvero.
      const identical = reference.filter((leaf) => translated.get(leaf.path) === leaf.value).length;
      assert.ok(
        identical / reference.length < 0.2,
        `${identical} voci su ${reference.length} identiche all italiano`
      );
    });
  }
});

describe('formattazione', () => {
  it('sostituisce i segnaposto', () => {
    assert.equal(fill('Mood fisso · {mood}', { mood: 'Flusso' }), 'Mood fisso · Flusso');
    assert.equal(fill('{a} e {b}', { a: 1, b: 2 }), '1 e 2');
  });

  it('lascia intatto un segnaposto senza valore', () => {
    assert.equal(fill('ciao {nome}', {}), 'ciao {nome}');
  });

  it('non tocca le stringhe senza segnaposto', () => {
    assert.equal(fill('Guardaroba', { mood: 'x' }), 'Guardaroba');
  });

  it('sceglie singolare e plurale', () => {
    const forms = { one: '{count} capo', other: '{count} capi' };
    assert.equal(plural(forms, 1), '1 capo');
    assert.equal(plural(forms, 2), '2 capi');
    assert.equal(plural(forms, 0), '0 capi');
  });

  it('usa il plurale giusto in ogni lingua', () => {
    assert.equal(plural(DICTIONARIES.en.wardrobe.count, 1), '1 piece');
    assert.equal(plural(DICTIONARIES.en.wardrobe.count, 3), '3 pieces');
    assert.equal(plural(DICTIONARIES.es.wardrobe.count, 1), '1 prenda');
    assert.equal(plural(DICTIONARIES.es.wardrobe.count, 3), '3 prendas');
  });
});
