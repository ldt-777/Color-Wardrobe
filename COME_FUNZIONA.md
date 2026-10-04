# Come funziona sottobanco

Guida rapida al motore di Color Wardrobe: cosa succede fra lo scatto e la griglia,
e perché le scelte sono quelle.

Scritta anche per le parti che esistono solo come progetto. Dove è così, è
segnato: **〔progetto〕** significa deciso e verificato sui numeri, ma non ancora
in codice.

---

## La premessa: OKLab, non HSL

Tutto il motore ragiona in **OKLab**. È la decisione da cui dipende ogni cosa che
viene dopo, e il motivo è uno: in OKLab la distanza euclidea fra due colori
corrisponde a quanto l'occhio li vede diversi. In RGB e in HSL no.

Questo trasforma problemi di gusto in problemi di aritmetica. Raggruppare i colori
di una foto, decidere se due capi si abbinano, trovare la sequenza che scorre
meglio: tutte operazioni su distanze, una volta che le distanze sono quelle giuste.

La prova più rapida: ordina sedici colori per luminosità HSL e la striscia salta —
il giallo finisce fra gli scuri, il blu acceso fra i chiari. HSL calcola la
luminosità come media fra il canale più alto e il più basso, che non è come la
percepiamo. Ordinati per `L` in OKLab salgono senza strappi.

Usiamo anche **OKLCH**, che è lo stesso spazio in coordinate polari: `L`
luminosità, `C` croma (saturazione), `h` tinta in gradi. Serve quando la domanda
riguarda la tinta — "quanto distano sulla ruota?" — invece della distanza.

Tutto sta in `src/color/space.ts`: conversioni, `deltaE`, `hueDistance`, il
calore di una tinta, e la soglia sotto cui un colore è **neutro** (croma < 0,038,
cioè sotto il punto in cui l'occhio legge una tinta).

---

## La catena, sei stadi

### 1. Inquadratura

`src/color/subject.ts` · `detectSubjectBounds`

Dopo lo scatto l'app propone un ritaglio. La maschera del primo piano viene
proiettata in **profili di riga e di colonna**, e il rettangolo è dove quei
profili superano il 6% di occupazione.

**Perché i profili e non il rettangolo minimo dei pixel accesi:** un riflesso
isolato in un angolo allargherebbe il ritaglio a tutta l'immagine. Una soglia di
occupazione lo ignora.

**Perché il ritaglio viene prima del nome:** finché non è deciso, la palette
mostrata sarebbe quella della foto intera, sfondo compreso. Chiedendo prima il
ritaglio, i colori del secondo passo sono già quelli veri del capo. Per questo
`extractSwatches` accetta un ritaglio.

### 2. Pixel

`src/color/png.ts`, `decode.ts`, `extract.ts`

La foto ritagliata scende a **160px** di lato e viene salvata in **PNG**;
`upng-js` la decodifica e da lì si lavora in JavaScript puro, senza moduli nativi
da compilare.

**Perché PNG e non JPEG:** la compressione JPEG inventa colori sui bordi del
capo, e il clustering li scambierebbe per tinte vere.

**Perché 160px:** cerchiamo le grandi masse di colore, non il dettaglio. A quella
dimensione i pixel di confine — quelli mezzi capo e mezzi sfondo — pesano molto
meno.

### 3. Palette

`src/color/quantize.ts` · `quantizeImage`

I pixel entrano in un **k-means pesato** in OKLab, con inizializzazione
k-means++ (il primo centro è il punto più pesante, i successivi sono estratti con
probabilità proporzionale alla distanza dal centro più vicino: evita che due
centroidi nascano sullo stesso colore).

Due correzioni sui pesi:

- **peso al centro** — una gaussiana morbida: il capo sta al centro
  dell'inquadratura, quindi i pixel centrali contano più di quelli ai margini.
  Morbida e non un ritaglio netto, così maniche e orli non spariscono.
- **smorzamento dello sfondo** — i colori della cornice esterna vengono
  identificati e ridotti al 8% del loro peso.

**La condizione che conta:** un colore del bordo viene smorzato *solo se non è
anche il colore del centro*. Senza quel controllo, un capo che riempie
l'inquadratura verrebbe preso per sfondo e cancellato dalla propria palette.
C'è un test apposta.

Alla fine i centroidi più vicini di ΔE 0,055 vengono fusi (sono lo stesso colore
per l'occhio) e quelli sotto il 2% di superficie scartati (sono rumore: bordi,
ombre, riflessi).

### 4. Scontorno

`src/color/subject.ts` · `cutoutSubject`

Lo sfondo diventa trasparente. Quattro accorgimenti, ognuno contro un difetto
preciso del taglio a soglia secca:

1. **Lo sfondo è previsto punto per punto**, interpolando fra i quattro angoli.
   Un muro ha vignettatura, un tavolo ha il gradiente della luce dalla finestra:
   sono variazioni lente, ed è esattamente quello che una soglia su un colore
   unico sbaglia.
2. **Due soglie invece di una**: sotto ΔE 0,05 è sfondo certo, sopra 0,14 è capo
   certo, in mezzo alfa parziale. Il contorno non è una linea, è una fascia.
3. **Si tiene solo la macchia opaca più grande**, buttando le isole sparse.
4. **Una media 3×3 sull'alfa** toglie la scalettatura senza spostare il contorno.

**La differenza con lo stadio 3:** qui i colori del bordo si prendono *senza*
chiedersi se siano anche al centro. Un capo piccolo lascia lo sfondo maggioritario
perfino al centro dell'inquadratura, e quel filtro lo scambierebbe per soggetto.
Il capo è già protetto da altro: dalla **connettività**, perché i suoi pixel non
si raggiungono dal bordo senza attraversarlo.

Se lo scontorno non riesce, `cutoutUri` resta `null` e la scheda ripiega sulla
miniatura piena. Meglio una foto col suo sfondo che una scheda vuota.

### 5. Ruoli e colore firma

`src/color/roles.ts` · `rankSwatches`

Ogni colore del capo riceve un ruolo — `base`, `secondario`, `accento`, `neutro` —
e una **salience**, cioè la superficie corretta dalla saturazione:

```
salience = quota^0,65 × (0,32 + 0,68 × saturazione)
```

con la saturazione normalizzata su un tetto di croma 0,22.

**Perché l'esponente sotto 1:** comprime la superficie, così un accento piccolo
ma acceso non sparisce dietro un fondo grande e spento.

Il colore con salience più alta è la **firma** del capo, quella con cui si
presenta nella griglia. Due casi che mostrano la formula al lavoro:

| Capo | Colore | Quota | Croma | Salience |
|---|---|---|---|---|
| camicia bianca con logo | panna `#F2F0EA` | 86% | 0,008 | **0,313** |
| | rosso `#C21B24` | 14% | 0,198 | 0,260 |
| giacca grigio/arancio | grigio `#4A4A4C` | 55% | 0,006 | 0,224 |
| | arancio `#C64B12` | 45% | 0,152 | **0,501** |

La camicia resta bianca di poco: il logo recupera quasi tutto il divario di
superficie grazie alla saturazione, ma non abbastanza. La giacca si presenta
arancione nonostante l'arancione copra *meno* superficie del grigio.

### 6. Contesto del guardaroba

`src/color/roles.ts` · `buildWardrobeContext`

Le firme di tutti i capi vengono raggruppate in **famiglie di colore** (di nuovo
k-means, k=8). Da lì, per ogni capo:

- **versatilità** — la frazione degli altri capi che gli si abbina, secondo il
  punteggio di armonia qui sotto;
- **rarità** — `1 − quota della sua famiglia / quota della famiglia più grande`.

Sono valori **relativi all'insieme**, non proprietà del capo. Lo stesso maglione
blu è un pilastro in un guardaroba di neutri e un pezzo raro in uno tutto rosso.

---

## L'armonia

`src/color/harmony.ts` · `harmonyScore`

Un punteggio da 0 a 1 fra **due** colori, in tre mosse.

### 1. La distanza sulla ruota

Due tinte si accostano bene a tre distanze, le classiche della teoria del colore:

| Distanza | Relazione | Peso |
|---|---|---|
| ~0° (entro 35°) | **vicine**, stessa famiglia | 0,85 |
| ~180° | **complementari** | 1,00 |
| ~120° | **triade** | 0,80 |

Non sono soglie secche ma campane: più ti avvicini al centro di una delle tre,
più alto il punteggio. Tutto quello che sta **in mezzo** è terra di nessuno, e il
punteggio crolla — un blu e un verde a 70° non sono né parenti né opposti, sono
due colori che litigano.

### 2. Il contrasto di luce moltiplica

```
fattore = 0,55 + 0,45 × min(|ΔL| / 0,28, 1)
```

Due tinte alla distanza giusta ma della **stessa chiarezza** sbavano una
nell'altra: le vedi come una macchia sola. Più differiscono in luce, più il
punteggio sale.

C'è anche una piccola penale (×0,85) quando *entrambe* le croma superano 0,16:
due tinte molto sature litigano più di quanto la geometria suggerisca.

### 3. I neutri sono un caso a parte

Un grigio, un bianco, un nero non hanno una tinta vera: non ha senso chiedersi a
quanti gradi stiano da qualcosa. **Vanno con tutto**, e conta solo la mossa 2:

```
punteggio = 0,78 × fattore di luce
```

Due grigi identici non fanno un abbinamento, fanno una macchia. Un grigio chiaro
e un nero sì.

### La soglia

`HARMONY_THRESHOLD = 0,5`. Sopra, due capi si abbinano; sotto, no. È la soglia
che alimenta la versatilità e l'elenco «ci sta bene con».

---

## I mood

`src/color/moods.ts`, `arrange.ts`, `src/ui/moodSurface.ts`

Un mood è **due cose insieme**:

- `arrangement` — come i capi vengono messi in fila;
- `affinity` — quanto ogni singolo capo appartiene a quel mood, da 0 a 1.

L'ordine viene dal primo, il risalto visivo dal secondo. Cambiare mood non è un
filtro che nasconde roba: è lo stesso guardaroba raccontato in un altro modo. I
capi lontani dal mood scendono di opacità fino al 58%, non sotto.

| Mood | Ordinamento | Affinità premia |
|---|---|---|
| Spettro | ruota cromatica, neutri in coda | la croma |
| Flusso | cammino più morbido | i capi mainstream (bassa rarità) |
| Quiete | croma crescente | bassa croma, alta luce |
| Carattere | cammino più aspro | croma e rarità |
| Terra | blocchi per famiglia di tinta | il calore della tinta |
| Notte | luminosità crescente | il buio e i neutri |

**Flusso e Carattere risolvono lo stesso problema in direzioni opposte**: un
cammino goloso sul grafo dei colori, che a ogni passo prende il vicino
percettivamente più prossimo o più lontano. È un'euristica sul commesso
viaggiatore — non dà l'ottimo, ma su qualche centinaio di capi produce una
sequenza senza salti visibili in pochi millisecondi. Si prova da alcune partenze
diverse (agli estremi di luminosità) e si tiene la migliore.

Ogni mood ha anche un **fondo neutro** su cui i capi poggiano. Sono neutri veri:
la croma resta sotto 0,02. Quel poco che c'è serve solo a dare temperatura —
*Terra* tende alla sabbia, *Notte* al grigio freddo — senza mai entrare in
competizione con il colore del capo.

I nomi e le descrizioni dei mood **non stanno in `moods.ts`** ma nelle
traduzioni, indicizzati per `id`: quel file descrive come si comporta un mood,
non come lo si chiama.

---

## Le combinazioni 〔progetto〕

Tre rulli, uno per parte del corpo — sopra, sotto, fuori — così una riga che li
attraversa è davvero un outfit.

### Due filtri in fila

**1. L'armonia ammette.** Si calcolano le tre coppie della terna e si aggregano:

```
punteggio = media(sopra-sotto ×2, sotto-fuori, sopra-fuori)
            − max(0, 0,35 − coppia_peggiore) × 0,35
```

Sopra-sotto pesa il doppio perché è la coppia che occupa quasi tutta la figura;
la penale rifiuta una terna con un accostamento davvero stonato. Su un guardaroba
di esempio di 16 capi, **47 terne su 108** superano la soglia di 0,5.

**2. Il mood sceglie fra le ammesse**, pesando ogni terna con la media
dell'affinità dei suoi tre capi — la stessa funzione che nella griglia decide
quali capi emergono.

### Perché la macchina non cerca il massimo

Misurando le 108 terne è venuto fuori che le migliori in assoluto sono **sempre**
"un colore e due neutri". Non è un difetto del punteggio: in quel guardaroba due
pantaloni su tre sono neutri, e una coppia che coinvolge un neutro è limitata a
0,78 per costruzione. È una descrizione vera dell'armadio — ed è anche come si
veste bene la maggior parte delle persone.

Ma una macchina che atterra sempre sulla stessa combinazione è corretta e
inutile. Quindi **pesca fra quelle che superano la soglia**, non converge sulla
migliore. Quarantasette terne sono varietà abbondante.

### Che il mood conti davvero, misurato

- i sei mood scelgono **sei terne diverse**;
- *Spettro* e *Notte* non hanno **nulla** in comune nelle rispettive prime cinque;
- *Quiete* e *Spettro*: zero sovrapposizioni.

Un difetto noto: **Spettro e Carattere si sovrappongono su 4 terne su 5**, perché
entrambi premiano croma e rarità. Su questo campione i sei mood si comportano come
quattro. Va riverificato con un guardaroba vero: 47 terne su 16 capi è un campione
piccolo, e con cinquanta capi il numero esplode.

### Niente algoritmo nuovo

`harmonyScore` e le funzioni di affinità esistono già. Questa è la loro
composizione — un filtro e un peso — non un'invenzione.

---

## I dati

`src/db/`

SQLite locale, migrazioni contate da `PRAGMA user_version`: aggiungere uno schema
futuro significa appendere una stringa a `MIGRATIONS`.

```
garments   (id, name, category, image_uri, thumb_uri, cutout_uri, created_at)
swatches   (garment_id, position, hex, lightness, chroma, hue, share, role)
app_settings (key, value)
```

Le foto vere stanno nel filesystem, in una cartella privata dell'app
(`documents/garments/`): nel database ci sono solo i percorsi.

**Nel database vanno identificatori, non etichette.** Categorie, ruoli e mood
sono salvati come `knitwear`, `accento`, `flusso`; il testo mostrato arriva dalle
traduzioni. Salvare l'etichetta renderebbe illeggibile il guardaroba già
archiviato al primo cambio di lingua — e infatti la migrazione 2 esiste proprio
per convertire i capi salvati quando le categorie erano in italiano. La sua
ultima riga raccoglie in `other` qualsiasi valore imprevisto, invece di lasciare
in giro categorie che nessuna lingua sa più tradurre.

La `salience` non viene persistita: è derivabile dagli stessi dati, e
ricalcolarla evita che un cambio di formula lasci in giro valori vecchi.

### Le combinazioni salvate 〔progetto〕

```
outfits      (id, created_at, rating INTEGER NULL)
outfit_items (outfit_id, garment_id, slot)
```

`slot` è `sopra` / `sotto` / `fuori` come identificatore, non come etichetta.

Il voto è **nullable**, e `null` non è zero stelle: è "non ancora valutata". La
UI scrive quella frase invece di mostrare cinque stelle vuote, che leggerebbero
come un voto bassissimo. Nessun valore sentinella: in SQLite il nullable è
naturale.

**Domanda aperta:** se elimini un capo, le combinazioni che lo contengono vanno
cancellate, marcate come incomplete, o resta lo storico col capo mancante in
grigio? Va deciso prima di scrivere la migrazione.

---

## Le regole dell'architettura

- **Il motore colore (`src/color/`) non importa React Native.** È quello che
  permette a `npm test` di girare su Node in due secondi, senza simulatore né
  dispositivo. Le uniche eccezioni sono `decode.ts` ed `extract.ts`, che toccano
  il filesystem, e infatti restano fuori dai test.
- **Si ragiona in OKLab.** Qualsiasi confronto, ordinamento o raggruppamento di
  colori passa da `space.ts`.
- **L'interfaccia non ha colori propri.** La tavolozza in `src/ui/theme.ts` è
  fatta solo di grigi caldi, e i fondi delle schede in `moodSurface.ts` restano
  sotto la soglia di croma in cui l'occhio legge una tinta.
- **Nessuna stringa scritta a mano nelle schermate.** Tutto quello che l'utente
  legge sta in `src/i18n/translations.ts`, dove l'italiano fa anche da tipo: una
  voce dimenticata in inglese o spagnolo è un errore di compilazione, non una
  stringa mancante scoperta a schermo. Fanno eccezione i `console.error`, che
  parlano a noi.
- **Import senza estensione** (li risolve Metro). I test vengono compilati prima
  da `tsc -p tsconfig.test.json`, per questo funzionano lo stesso.

### Un dettaglio di accessibilità che vale la pena ricordare

Il grigio del testo secondario è stato scelto misurandolo contro **tutti** i
fondi su cui poggia davvero: la shell, le superfici e i sei fondi di mood. Il
caso peggiore in chiaro è *Notte* (il più scuro dei sei), in scuro è *Terra* (il
più chiaro). I valori precedenti scendevano a 3,25:1 e 4,14:1, sotto il 4,5:1 che
serve a un testo piccolo. Misurare solo contro lo sfondo principale non basta.

---

## Che cosa è verificato, e come

```bash
npm test
```

55 controlli su Node, divisi in due file: 42 sul motore, 13 sulle traduzioni.

**`src/color/engine.test.ts`** — il motore, su immagini sintetiche generate a
mano, di cui conosciamo già la risposta giusta. Fra gli altri: il giro
sRGB→OKLab→sRGB torna al punto di partenza; una tinta unita dà un solo colore;
due tinte danno due colori nelle proporzioni giuste; **lo sfondo bianco non
diventa il colore del capo**; **un capo che riempie l'inquadratura resta se
stesso**; il rumore di compressione non moltiplica i colori; la camicia bianca
col logo resta bianca; i complementari battono un accostamento qualsiasi; nessun
ordinamento perde o duplica capi; *Flusso* scorre più morbido di *Carattere*;
*Spettro* percorre la ruota in ordine e mette i neutri in coda.

**`src/i18n/i18n.test.ts`** — 13 controlli su ciò che i tipi non vedono: stringhe
vuote, segnaposto che non combaciano fra le lingue (un `{count}` perso in
traduzione compila benissimo e poi mostra "prendas" senza numero), dizionari
copiati dall'italiano e mai tradotti.

Oltre ai test: `npm run typecheck` e `npx expo export` per Android, iOS e web,
che è la verifica che il bundle si costruisca.

**Quello che nessun test copre:** l'app in mano. Fotocamera, permessi, resa della
griglia, fluidità del riordino, e soprattutto lo scontorno su foto difficili — un
capo bianco su muro bianco, un'ombra netta dietro, un pavimento a parquet. La
versione su SDK 54 è girata su un Pixel 9a ad agosto; la 57 no.
