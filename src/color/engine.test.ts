/**
 * Banco di prova del motore colore.
 *
 * Gira su Node (`npm test`) senza simulatore ne dispositivo: tutto quello che
 * viene verificato qui e' matematica pura, quindi non ha bisogno di React
 * Native. Le foto sono sintetizzate a mano, cosi' sappiamo esattamente quale
 * risposta e' quella giusta.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { arrangeGarments, type Arrangeable, type ArrangementId } from './arrange';
import { harmonyScore, pairsWell } from './harmony';
import { quantizeImage, type Swatch } from './quantize';
import { buildWardrobeContext, rankSwatches, signatureSwatch } from './roles';
import { cutOutBackground, detectSubjectBounds, opaqueShare } from './subject';
import {
  deltaE,
  hexToOklab,
  hexToOklch,
  hexToRgb,
  isNeutral,
  oklabToHex,
  oklabToOklch,
  oklchToOklab,
  readableInk,
  warmth,
} from './space';

// --- utilita' ---------------------------------------------------------------

/** Genera una finta foto: `paint` decide il colore di ogni pixel. */
function image(width: number, height: number, paint: (x: number, y: number) => [number, number, number]) {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

const swatchOf = (hex: string, share: number): Swatch => {
  const lab = hexToOklab(hex);
  return { hex, lab, lch: oklabToOklch(lab), share };
};

/** Somma dei salti percettivi lungo una sequenza: piu' bassa, piu' morbida. */
const totalJump = (list: Arrangeable[]) =>
  list.reduce(
    (sum, item, index) =>
      index === 0 ? 0 : sum + deltaE(oklchToOklab(list[index - 1].signature), oklchToOklab(item.signature)),
    0
  );

// --- spazio colore ----------------------------------------------------------

describe('spazio colore', () => {
  it('sopravvive al giro sRGB -> OKLab -> sRGB', () => {
    for (const hex of ['#FF0000', '#00FF00', '#0000FF', '#7A5230', '#FFFFFF', '#000000', '#3C4F6E']) {
      const original = hexToRgb(hex);
      const roundTrip = hexToRgb(oklabToHex(hexToOklab(hex)));
      assert.ok(Math.abs(original.r - roundTrip.r) <= 1, `${hex} rosso`);
      assert.ok(Math.abs(original.g - roundTrip.g) <= 1, `${hex} verde`);
      assert.ok(Math.abs(original.b - roundTrip.b) <= 1, `${hex} blu`);
    }
  });

  it('colloca il rosso puro dove ci si aspetta sulla ruota', () => {
    assert.ok(Math.abs(hexToOklch('#FF0000').h - 29) < 6);
  });

  it('separa i neutri dalle tinte', () => {
    assert.ok(isNeutral(hexToOklch('#808080')));
    assert.ok(isNeutral(hexToOklch('#F2F0EA')));
    assert.ok(!isNeutral(hexToOklch('#FF0000')));
  });

  it('misura il calore di una tinta', () => {
    assert.ok(warmth(hexToOklch('#E08A2C')) > warmth(hexToOklch('#2C5AE0')));
    assert.equal(warmth(hexToOklch('#808080')), 0.5);
  });

  it('sceglie un inchiostro leggibile', () => {
    assert.equal(readableInk('#101014'), '#FFFFFF');
    assert.equal(readableInk('#F5F2EC'), '#101014');
  });
});

// --- estrazione della palette ----------------------------------------------

describe('estrazione della palette', () => {
  it('vede un solo colore in una tinta unita', () => {
    const swatches = quantizeImage(image(120, 160, () => [200, 30, 40]));
    assert.equal(swatches.length, 1);
    assert.ok(deltaE(swatches[0].lab, hexToOklab('#C81E28')) < 0.03);
    assert.ok(Math.abs(swatches[0].share - 1) < 0.001);
  });

  it('separa due tinte e ne rispetta le proporzioni', () => {
    const swatches = quantizeImage(image(120, 200, (_x, y) => (y < 120 ? [40, 60, 190] : [230, 200, 60])));
    assert.equal(swatches.length, 2);

    const blue = swatches.find((s) => s.lch.h > 220 && s.lch.h < 300);
    const yellow = swatches.find((s) => s.lch.h > 70 && s.lch.h < 120);
    assert.ok(blue, 'blu non trovato');
    assert.ok(yellow, 'giallo non trovato');
    assert.ok(blue.share > yellow.share, 'il blu occupa piu superficie');
  });

  it('non scambia lo sfondo per il capo', () => {
    // Il bianco copre piu' superficie del verde, ma sta tutto sulla cornice.
    const swatches = quantizeImage(
      image(160, 160, (x, y) =>
        x > 44 && x < 116 && y > 44 && y < 116 ? [30, 120, 70] : [246, 245, 242]
      )
    );
    assert.ok(deltaE(swatches[0].lab, hexToOklab('#1E7846')) < 0.06, `dominante ${swatches[0].hex}`);
  });

  it('non cancella un capo che riempie l inquadratura', () => {
    // Stesso verde di prima, stavolta fino ai bordi: tocca la cornice ma e'
    // anche il colore del centro, quindi non e' sfondo.
    const swatches = quantizeImage(image(160, 160, () => [30, 120, 70]));
    assert.ok(deltaE(swatches[0].lab, hexToOklab('#1E7846')) < 0.03, `dominante ${swatches[0].hex}`);
  });

  it('non moltiplica i colori sul rumore di compressione', () => {
    const swatches = quantizeImage(
      image(140, 180, (x, y) => {
        const jitter = ((x * 7 + y * 13) % 11) - 5;
        return [90 + jitter, 40 + jitter, 120 + jitter];
      })
    );
    assert.ok(swatches.length <= 2, `ne ha trovati ${swatches.length}`);
  });

  it('regge un immagine vuota senza esplodere', () => {
    assert.deepEqual(quantizeImage({ width: 0, height: 0, data: new Uint8Array(0) }), []);
  });
});

// --- ruoli dentro il singolo capo -------------------------------------------

describe('priorita dentro il capo', () => {
  it('assegna base, accento e neutro', () => {
    const ranked = rankSwatches([
      swatchOf('#E9E7E1', 0.72),
      swatchOf('#D01F2A', 0.16),
      swatchOf('#2B2B30', 0.12),
    ]);

    assert.equal(ranked.find((s) => s.role === 'base')?.hex, '#E9E7E1');
    assert.ok(['secondario', 'accento'].includes(ranked.find((s) => s.hex === '#D01F2A')!.role));
    assert.equal(ranked.find((s) => s.hex === '#2B2B30')?.role, 'neutro');
  });

  it('lascia bianca una camicia bianca con un logo rosso', () => {
    const ranked = rankSwatches([swatchOf('#F2F0EA', 0.86), swatchOf('#C21B24', 0.14)]);
    assert.equal(signatureSwatch(ranked)?.hex, '#F2F0EA');
  });

  it('a parita di superficie fa emergere la tinta satura', () => {
    const ranked = rankSwatches([swatchOf('#4A4A4C', 0.55), swatchOf('#C64B12', 0.45)]);
    assert.equal(signatureSwatch(ranked)?.hex, '#C64B12');
  });
});

// --- armonia ----------------------------------------------------------------

describe('armonia fra colori', () => {
  it('premia i complementari rispetto a un accostamento qualsiasi', () => {
    const complementary = harmonyScore(hexToOklch('#2A5CC8'), hexToOklch('#C87A2A'));
    const clashing = harmonyScore(hexToOklch('#2A5CC8'), hexToOklch('#12A83E'));
    assert.ok(complementary > clashing, `${complementary} vs ${clashing}`);
  });

  it('fa del neutro un jolly', () => {
    assert.ok(pairsWell(hexToOklch('#3A3A3C'), hexToOklch('#12A83E')));
    assert.ok(pairsWell(hexToOklch('#3A3A3C'), hexToOklch('#C81E28')));
  });

  it('non considera abbinamento due colori identici', () => {
    assert.ok(!pairsWell(hexToOklch('#7F7F80'), hexToOklch('#7F7F80')));
  });

  it('resta nell intervallo 0..1', () => {
    for (const [a, b] of [
      ['#000000', '#FFFFFF'],
      ['#FF0000', '#00FF00'],
      ['#123456', '#123456'],
    ] as const) {
      const score = harmonyScore(hexToOklch(a), hexToOklch(b));
      assert.ok(score >= 0 && score <= 1, `${a}/${b} -> ${score}`);
    }
  });
});

// --- lettura del guardaroba -------------------------------------------------

const WARDROBE = [
  '#C81E28', '#E08A2C', '#E8D44A', '#3E9B4F', '#2A5CC8', '#7A3FA8',
  '#F2F0EA', '#2B2B30', '#8C8A85', '#7A5230', '#1E7846', '#D46A9F',
];

const buildItems = () => WARDROBE.map((hex, index) => ({ id: `g${index}`, signature: hexToOklch(hex) }));

describe('priorita nel contesto del guardaroba', () => {
  it('riassume il guardaroba in famiglie di colore', () => {
    const context = buildWardrobeContext(buildItems());
    assert.ok(context.families.length > 1 && context.families.length <= 8);
    const total = context.families.reduce((sum, family) => sum + family.share, 0);
    assert.ok(Math.abs(total - 1) < 0.001, `le quote sommano a ${total}`);
  });

  it('riconosce il neutro come il capo piu versatile', () => {
    const context = buildWardrobeContext(buildItems());
    const neutral = context.stats.get('g7')!; // #2B2B30
    const vivid = context.stats.get('g11')!; // #D46A9F
    assert.ok(neutral.versatility > vivid.versatility, `${neutral.versatility} vs ${vivid.versatility}`);
  });

  it('tiene rarita e versatilita in scala', () => {
    const context = buildWardrobeContext(buildItems());
    for (const stats of context.stats.values()) {
      assert.ok(stats.rarity >= 0 && stats.rarity <= 1);
      assert.ok(stats.versatility >= 0 && stats.versatility <= 1);
    }
  });

  it('non si rompe su un guardaroba vuoto', () => {
    const context = buildWardrobeContext([]);
    assert.equal(context.stats.size, 0);
    assert.deepEqual(context.families, []);
  });
});

// --- ordinamenti ------------------------------------------------------------

describe('ordine ideale dei capi', () => {
  const items = buildItems();
  const context = buildWardrobeContext(items);
  const arrangeables: Arrangeable[] = items.map((item) => ({
    id: item.id,
    signature: item.signature,
    stats: context.stats.get(item.id)!,
  }));

  const ALL: ArrangementId[] = ['spettro', 'flusso', 'quiete', 'contrasto', 'famiglie', 'profondita'];

  for (const arrangement of ALL) {
    it(`"${arrangement}" non perde ne duplica capi`, () => {
      const ordered = arrangeGarments(arrangeables, arrangement);
      assert.equal(ordered.length, arrangeables.length);
      assert.equal(new Set(ordered.map((item) => item.id)).size, arrangeables.length);
    });
  }

  it('"Flusso" e piu morbido di "Carattere" e dell ordine di partenza', () => {
    const flow = totalJump(arrangeGarments(arrangeables, 'flusso'));
    assert.ok(flow < totalJump(arrangeGarments(arrangeables, 'contrasto')));
    assert.ok(flow < totalJump(arrangeables));
  });

  it('"Spettro" percorre la ruota e mette i neutri in coda', () => {
    const ordered = arrangeGarments(arrangeables, 'spettro');
    const chromatic = ordered.filter((item) => !isNeutral(item.signature));
    assert.ok(chromatic.every((item, i) => i === 0 || chromatic[i - 1].signature.h <= item.signature.h));
    assert.ok(ordered.slice(chromatic.length).every((item) => isNeutral(item.signature)));
  });

  it('"Notte" va dal piu scuro al piu chiaro', () => {
    const ordered = arrangeGarments(arrangeables, 'profondita');
    assert.ok(ordered.every((item, i) => i === 0 || ordered[i - 1].signature.L <= item.signature.L));
  });

  it('regge zero e un capo', () => {
    assert.equal(arrangeGarments([], 'spettro').length, 0);
    assert.equal(arrangeGarments(arrangeables.slice(0, 1), 'flusso').length, 1);
  });
});

// --- ritaglio e scontorno --------------------------------------------------

describe('rilevamento del capo', () => {
  /** Capo scuro centrato su fondo chiaro, con margini noti. */
  const onPlainBackground = () =>
    image(200, 200, (x, y) =>
      x >= 50 && x < 150 && y >= 40 && y < 160 ? [40, 60, 130] : [244, 243, 240]
    );

  it('trova il rettangolo attorno al capo', () => {
    const rect = detectSubjectBounds(onPlainBackground());
    assert.ok(rect, 'nessun rettangolo trovato');

    // Il rilevamento aggiunge un margine, quindi il rettangolo deve contenere
    // il capo e restare vicino ai suoi bordi.
    assert.ok(rect.x <= 0.25 && rect.x > 0.15, `x = ${rect.x}`);
    assert.ok(rect.y <= 0.2 && rect.y > 0.1, `y = ${rect.y}`);
    assert.ok(rect.x + rect.width >= 0.75, `bordo destro = ${rect.x + rect.width}`);
    assert.ok(rect.y + rect.height >= 0.8, `bordo inferiore = ${rect.y + rect.height}`);
  });

  it('resta dentro l inquadratura', () => {
    const rect = detectSubjectBounds(onPlainBackground())!;
    assert.ok(rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.width <= 1 && rect.y + rect.height <= 1);
  });

  it('non propone ritagli quando il capo riempie la foto', () => {
    assert.equal(detectSubjectBounds(image(160, 160, () => [40, 60, 130])), null);
  });

  it('segue il capo anche quando non e centrato', () => {
    // Capo spostato in alto a sinistra: il rettangolo deve seguirlo, non
    // limitarsi a stringere attorno al centro dell'inquadratura.
    const rect = detectSubjectBounds(
      image(200, 200, (x, y) =>
        x >= 20 && x < 90 && y >= 15 && y < 95 ? [150, 40, 50] : [244, 243, 240]
      )
    )!;

    assert.ok(rect, 'nessun rettangolo trovato');
    assert.ok(rect.x < 0.12, `bordo sinistro troppo lontano: ${rect.x}`);
    assert.ok(rect.x + rect.width < 0.55, `si estende troppo a destra: ${rect.x + rect.width}`);
    assert.ok(rect.y + rect.height < 0.55, `si estende troppo in basso: ${rect.y + rect.height}`);
  });
});

describe('scontorno', () => {
  it('rende trasparente lo sfondo e lascia il capo', () => {
    const cut = cutOutBackground(
      image(120, 120, (x, y) =>
        x >= 30 && x < 90 && y >= 30 && y < 90 ? [30, 120, 70] : [246, 245, 242]
      )
    );

    const alphaAt = (x: number, y: number) => cut.data[(y * cut.width + x) * 4 + 3];
    assert.equal(alphaAt(5, 5), 0, 'angolo ancora opaco');
    assert.equal(alphaAt(60, 60), 255, 'centro del capo diventato trasparente');

    const share = opaqueShare(cut);
    // Il quadrato copre 60x60 su 120x120, cioe' un quarto della superficie.
    assert.ok(Math.abs(share - 0.25) < 0.03, `superficie opaca ${share}`);
  });

  it('non intacca un capo dello stesso colore dello sfondo ma non collegato', () => {
    // Camicia bianca su muro bianco: il centro non e' raggiungibile dal bordo
    // senza attraversare la fascia scura, quindi resta.
    const cut = cutOutBackground(
      image(120, 120, (x, y) => {
        const inside = x >= 30 && x < 90 && y >= 30 && y < 90;
        const border = inside && (x < 36 || x >= 84 || y < 36 || y >= 84);
        if (border) return [40, 40, 44];
        return inside ? [246, 245, 242] : [246, 245, 242];
      })
    );

    const alphaAt = (x: number, y: number) => cut.data[(y * cut.width + x) * 4 + 3];
    assert.equal(alphaAt(60, 60), 255, 'interno chiaro cancellato');
    assert.equal(alphaAt(2, 2), 0, 'sfondo rimasto');
  });

  it('si mangia tutto quando il capo tocca ogni bordo', () => {
    // Non e' un difetto ma il segnale concordato: senza un bordo da cui
    // partire il riempimento non ha appigli, e `prepareGarmentImage` scarta il
    // risultato guardando proprio questa quota.
    const solid = image(80, 80, () => [30, 120, 70]);
    assert.ok(opaqueShare(cutOutBackground(solid)) < 0.05);
  });
});

describe('scontorno su sfondi difficili', () => {
  it('regge uno sfondo in gradiente', () => {
    // Muro che va dal chiaro allo scuro: una soglia unica ne perderebbe meta',
    // scambiando il lato scuro per capo.
    const cut = cutOutBackground(
      image(140, 140, (x, y) => {
        if (x >= 45 && x < 95 && y >= 45 && y < 95) return [180, 60, 50];
        const shade = 250 - Math.round((x + y) * 0.45);
        return [shade, shade - 2, shade - 5];
      })
    );

    const alphaAt = (x: number, y: number) => cut.data[(y * cut.width + x) * 4 + 3];
    assert.equal(alphaAt(4, 4), 0, 'angolo chiaro rimasto');
    assert.equal(alphaAt(135, 135), 0, 'angolo scuro scambiato per capo');
    assert.equal(alphaAt(70, 70), 255, 'capo cancellato');
  });

  it('scarta gli oggetti sullo sfondo staccati dal capo', () => {
    // Una macchia scura in un angolo non e' il capo: deve sparire con lo
    // sfondo, non restare appesa accanto.
    const cut = cutOutBackground(
      image(140, 140, (x, y) => {
        if (x >= 45 && x < 100 && y >= 40 && y < 105) return [40, 70, 150];
        if (x >= 8 && x < 24 && y >= 8 && y < 24) return [60, 55, 50];
        return [245, 244, 241];
      })
    );

    const alphaAt = (x: number, y: number) => cut.data[(y * cut.width + x) * 4 + 3];
    assert.equal(alphaAt(16, 16), 0, 'la macchia sullo sfondo e sopravvissuta');
    assert.equal(alphaAt(70, 70), 255, 'capo cancellato');
  });

  it('sfuma il contorno invece di scalettarlo', () => {
    const cut = cutOutBackground(
      image(120, 120, (x, y) =>
        x >= 35 && x < 85 && y >= 35 && y < 85 ? [30, 120, 70] : [246, 245, 242]
      )
    );

    // Con un taglio a soglia secca ogni pixel sarebbe 0 o 255; la fascia di
    // valori intermedi e' quello che rende il bordo morbido sulla scheda.
    let partial = 0;
    for (let i = 3; i < cut.data.length; i += 4) {
      if (cut.data[i] > 8 && cut.data[i] < 247) partial++;
    }
    assert.ok(partial > 40, `solo ${partial} pixel di transizione`);
  });
});
