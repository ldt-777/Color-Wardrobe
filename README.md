# Color Wardrobe

Guardaroba digitale che ragiona per colori. Fotografi un capo, l'app ne estrae la
palette, capisce che ruolo ha quel colore dentro il capo e dentro il resto del
guardaroba, e dispone tutto nell'ordine che rende meglio secondo il **mood** che
hai scelto.

Un solo codice per Android e iOS (Expo / React Native). Tutto resta sul telefono:
nessun account, nessuna rete, nessun backend.

---

## Partire da zero

Serve Node 20+ e l'app **Expo Go** installata sul telefono.

```bash
npm install
npm start
```

Poi inquadra il QR code che appare nel terminale con la fotocamera del telefono
(su Android si apre direttamente in Expo Go). Mac e telefono devono stare sulla
stessa rete Wi-Fi; se la rete fa i capricci, `npm start -- --tunnel`.

```bash
npm test        # verifica il motore colore (gira su Node, senza telefono)
npm run typecheck
```

### Quando serve una dev build

Expo Go basta per tutto quello che c'è adesso. Diventerà necessario passare a una
dev build (`npx expo run:android`, con Android Studio installato) solo quando
aggiungeremo una libreria con codice nativo che Expo Go non contiene.

---

## Come funziona

### 1. Dalla foto ai colori

`expo-image-manipulator` riduce la foto a 160px di lato e la salva in **PNG**: il
JPEG, comprimendo, inventerebbe colori sui bordi del capo che il clustering poi
scambierebbe per tinte vere. `upng-js` decodifica i pixel, e da lì si lavora in
JavaScript puro — nessun modulo nativo da compilare.

Ogni pixel viene convertito in **OKLab**. È la scelta che regge tutto il resto:
in OKLab la distanza euclidea fra due colori corrisponde alla differenza che
l'occhio percepisce davvero, cosa che né RGB né HSL garantiscono. Ordinare,
raggruppare e confrontare colori diventa aritmetica.

I pixel entrano in un **k-means pesato** (init k-means++), con due correzioni:

- **peso al centro** — il capo sta al centro dell'inquadratura, quindi i pixel
  centrali contano di più, con una gaussiana morbida che non taglia via maniche
  e orli;
- **soppressione dello sfondo** — i colori della cornice esterna vengono
  identificati e depotenziati, *ma solo se non sono anche il colore del centro*.
  Senza quest'ultimo controllo, un capo che riempie l'inquadratura verrebbe
  scambiato per sfondo e cancellato dalla propria palette.

### 2. Priorità dentro il capo

Ogni colore riceve un ruolo — `base`, `secondario`, `accento`, `neutro` — e una
**salience**, cioè superficie corretta dalla saturazione:

```
salience = quota^0.65 × (0.32 + 0.68 × saturazione)
```

L'esponente sotto 1 comprime la superficie, così un accento piccolo ma acceso
non sparisce dietro un fondo grande e spento. Il colore con salience massima è
la **firma** del capo, quello con cui si presenta nella griglia. In pratica: una
camicia bianca con logo rosso resta bianca, ma una giacca metà grigia e metà
arancione si presenta arancione.

### 3. Priorità dentro il guardaroba

Le firme di tutti i capi vengono raggruppate in **famiglie di colore** (di nuovo
k-means). Da lì, per ogni capo:

- **versatilità** — quanti altri capi ci si abbinano, secondo un punteggio di
  armonia che pesa le tre relazioni classiche della ruota cromatica (analogia,
  complementare, triade) per il contrasto di luminosità;
- **rarità** — quanto il suo colore è fuori dal coro rispetto al guardaroba.

Sono numeri relativi: lo stesso maglione blu è un pilastro in un guardaroba di
neutri e un pezzo raro in uno tutto rosso.

### 4. I mood

Un mood è due cose insieme: **come i capi vengono messi in fila** e **quanto
ogni capo appartiene a quel mood**. L'ordine viene dal primo, il risalto visivo
dal secondo — i capi lontani dal mood arretrano invece di sparire, così il
guardaroba resta tutto lì ma l'occhio sa dove guardare.

| Mood | Ordine |
|---|---|
| **Spettro** | giro completo della ruota cromatica, neutri in coda |
| **Flusso** | sfumatura continua: ogni capo è il più vicino possibile al precedente |
| **Quiete** | dai toni bassi e polverosi ai più accesi |
| **Carattere** | ogni capo stacca dal vicino, il massimo del contrasto |
| **Terra** | blocchi per famiglia di tinta, dalla più numerosa |
| **Notte** | dal più scuro al più chiaro |

*Flusso* e *Carattere* risolvono lo stesso problema in direzioni opposte — un
cammino goloso sul grafo dei colori, minimizzando o massimizzando il salto
percettivo a ogni passo. È un'euristica sul commesso viaggiatore: non dà
l'ottimo, ma su qualche centinaio di capi produce una sequenza senza salti
visibili in pochi millisecondi.

Da **Impostazioni** si può fissare un mood: da quel momento il guardaroba si
ordina sempre allo stesso modo e i pulsanti in alto spariscono.

---

## Struttura

```
app/                    schermate (expo-router, una schermata = un file)
  index.tsx             il guardaroba
  capture.tsx           fotocamera
  review.tsx            palette estratta + salvataggio
  garment/[id].tsx      dettaglio capo e abbinamenti
  settings.tsx          mood fisso, vista solo-colore

src/color/              il motore, senza dipendenze da React Native
  space.ts              conversioni sRGB / OKLab / OKLCH, distanze
  decode.ts             PNG -> pixel
  quantize.ts           k-means pesato, campionamento, sfondo
  roles.ts              ruoli dentro il capo, statistiche di guardaroba
  harmony.ts            punteggio di armonia fra due colori
  arrange.ts            i sei algoritmi di ordinamento
  moods.ts              i mood, come combinazione di ordine + affinità
  engine.test.ts        banco di prova su immagini sintetiche

src/db/                 SQLite: capi, palette, impostazioni
src/store/              stato dell'app
src/ui/                 tema e componenti
```

Il motore colore non importa nulla di React Native: per questo `npm test` gira su
Node in un paio di secondi, senza simulatore né dispositivo.

---

## Interfaccia

L'interfaccia è volutamente priva di colore — solo grigi caldi, chiari e scuri.
L'unico colore che deve arrivare all'occhio è quello dei capi: se l'app mettesse
del suo, il guardaroba dovrebbe competere con lei.

Le schede sono costruite attorno al colore e non attorno alla foto: il fondo è la
firma del capo, la foto ci galleggia dentro con un margine. In griglia formano un
mosaico che si legge come una palette. Il pulsante in alto a destra toglie del
tutto le foto e lascia i colori pieni.

---

## Dove i dati stanno

- Foto e miniature in una cartella privata dell'app (`documents/garments/`).
- Palette e impostazioni in SQLite locale, con migrazioni su `PRAGMA user_version`.

Lo schema è già pensato perché un eventuale sync possa essere aggiunto sopra
senza riscriverlo.
