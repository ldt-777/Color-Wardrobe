# Color Wardrobe

Il tuo guardaroba, guardato dai colori.

Fotografi un capo, l'app ne legge i colori, capisce quale lo definisce, e dispone
tutto l'armadio nell'ordine che rende meglio. Non è un'app per contare i vestiti:
è un'app per vederli.

Android e iOS, un solo codice. Tutto resta sul telefono: nessun account, nessuna
rete, nessun server.

---

## Com'è fatta

L'interfaccia non ha colori propri — solo grigi caldi, chiari e scuri. L'unica
cosa colorata dello schermo sei tu, cioè la tua roba. Se l'app mettesse del suo,
il guardaroba dovrebbe competere con lei.

Tre sezioni:

| | |
|---|---|
| **Armadio** | sfogliare. La griglia dei capi, ordinata per colore. |
| **Combina** | decidere. Tre rulli, uno per parte del corpo: una riga che li attraversa è un outfit. |
| **Impostazioni** | la lingua, il mood fisso, la vista solo-colore. |

---

## Aggiungere un capo

Due passi, e il primo non è il nome.

**1. Inquadra.** Fotografi il capo, meglio su un fondo semplice — un tavolo, un
letto, un muro. L'app ti propone già un ritaglio, perché ha capito da sola dove
finisce il capo e dove comincia il tavolo. Lo correggi trascinando gli angoli.

Il ritaglio viene prima per un motivo preciso: finché non è deciso, i colori che
l'app ti mostrerebbe sarebbero quelli della foto intera, muro compreso.

**2. Descrivi.** Qui i colori sono già quelli veri del capo, e li vedi prima di
dare un nome. Scegli la categoria, scrivi il nome se vuoi, salvi.

L'app ritaglia anche lo sfondo attorno al capo, così nella griglia il maglione
poggia su un fondo pulito invece di portarsi dietro il tavolo di casa. Quando la
foto è troppo difficile — capo bianco su muro bianco, un'ombra netta dietro — lo
scontorno non riesce e la scheda mostra la foto intera. È previsto, non è un
errore.

---

## L'armadio

I capi stanno in griglia, ordinati per colore. Il colore di ogni scheda è il
colore **che definisce il capo**, che non sempre è quello che copre più
superficie: una camicia bianca con un logo rosso resta bianca, ma una giacca
metà grigia e metà arancione si presenta arancione.

Il pulsante in alto a destra toglie le foto e lascia i colori pieni. È la vista
che serve quando vuoi solo guardare: niente da leggere, niente da decidere.

### I sei mood

Un mood non filtra niente e non nasconde niente: è lo stesso armadio raccontato
in un altro ordine. I capi che stanno fuori dal mood arretrano, non spariscono.

| Mood | Cosa fa |
|---|---|
| **Spettro** | il giro completo della ruota cromatica, i neutri in coda |
| **Flusso** | una sfumatura continua: ogni capo è il più vicino possibile al precedente |
| **Quiete** | dai toni bassi e polverosi ai più accesi |
| **Carattere** | ogni capo stacca dal vicino, il massimo del contrasto |
| **Terra** | blocchi per famiglia di tinta, dalla più numerosa |
| **Notte** | dal più scuro al più chiaro |

Cambia anche la temperatura del fondo su cui i capi poggiano: *Terra* tende alla
sabbia, *Notte* al grigio freddo. Appena percettibile, e mai abbastanza da
diventare un colore.

Da Impostazioni puoi **fissare un mood**: da quel momento l'armadio si ordina
sempre allo stesso modo e le fascette in alto spariscono. È per chi vuole che la
cosa si comporti sempre uguale.

---

## Il singolo capo

Toccando un capo vedi la sua palette — quale colore è la base, quali
l'accompagnano, quale è l'accento — e due cose che dipendono da **tutto il
resto** dell'armadio:

- **Versatilità**: a quanti altri capi si abbina.
- **Rarità**: quanto il suo colore è fuori dal coro rispetto a quello che hai.

Sono numeri relativi, non proprietà del capo: lo stesso maglione blu è un
pilastro in un armadio di neutri e un pezzo raro in uno tutto rosso.

Sotto, i capi con cui sta meglio, in ordine.

---

## Combina

Tre rulli: sopra, sotto, fuori. Premi il pulsante e l'app ferma i rulli su una
combinazione che funziona davvero — non una a caso, e nemmeno sempre la stessa.

Sotto ti dice perché funziona, a parole: *«Il colore lo porta la giacca cammello;
t-shirt panna e jeans neri lo accompagnano.»*

Anche qui c'è l'interruttore foto / colore, e le due viste sono sincronizzate: se
fermi i rulli guardando le foto e passi ai colori, trovi la stessa combinazione.

Il mood decide il carattere delle combinazioni che escono: con *Terra* arrivano
accostamenti caldi, con *Notte* scuri e profondi.

### Salvare e votare

Una combinazione che ti piace la salvi nell'armadio, dove compare accanto ai
capi: il filtro in alto passa da **Capi** a **Combinazioni**.

Al salvataggio l'app ti chiede un voto da 1 a 5 stelle, e **puoi saltare**: una
combinazione senza voto resta "non ancora valutata" — non zero stelle, che
sarebbe un'altra cosa. Il voto si cambia quando vuoi, aprendo la combinazione e
toccando un numero diverso di stelle.

---

## Le lingue

Italiano, inglese, spagnolo. Lasciata su «come il telefono» segue il sistema; le
lingue che non copriamo ricadono sull'inglese.

Cambiare lingua non tocca il tuo armadio: i capi archiviati restano leggibili,
perché nel database finiscono identificatori e non etichette.

---

## Dove stanno i tuoi dati

Su questo telefono, e in nessun altro posto.

- Le foto in una cartella privata dell'app, non nella galleria.
- Colori, combinazioni e impostazioni in un database locale.

Niente account, niente rete, niente analisi. Se disinstalli l'app, i dati se ne
vanno con lei — non c'è un backup altrove, e per ora nemmeno un modo di
esportarli.

---

## Stato del lavoro

Questa è una base in costruzione, e vale la pena essere precisi su cosa esiste
davvero.

**Funziona nel codice:** fotocamera e import dalla galleria, ritaglio con
riquadro proposto, lettura dei colori, scontorno, ruoli e colore firma, griglia
ordinata per mood, i sei mood e il mood fisso, vista solo-colore, dettaglio del
capo con versatilità, rarità e abbinamenti, le tre lingue, il database con le
sue migrazioni.

**Esiste come progetto, non ancora come codice:** la barra delle tre sezioni,
i rulli di *Combina* con lo spin, le combinazioni salvate e il voto a stelle.
Sono disegnati schermata per schermata, con la logica già decisa e verificata sui
numeri, ma non ancora scritti.

**Non ancora provato su un telefono:** l'app è girata su un Pixel 9a ad agosto,
su Expo SDK 54. Da allora è salita a SDK 57 e quella versione ha superato i test
e si compila per Android, iOS e web, ma nessuno l'ha ancora vista in mano. La
prima cosa da fare è quella.

---

## Per farla girare

Serve Node 20+ e, per vederla sul telefono, Android Studio con l'SDK Android
installato.

```bash
npm install
npm run android     # compila e installa l'app sul dispositivo collegato
```

`npm run android` costruisce l'app vera: Expo Go non basta più, perché l'app sta
su un SDK più recente di quello che Expo Go contiene.

```bash
npm test            # il motore colore e le traduzioni, su Node, senza telefono
npm run typecheck
npm run web         # una prova rapida nel browser del Mac
```

Come funziona sotto il cofano — lo spazio colore, il clustering, lo scontorno,
l'armonia, i mood — sta in **[COME_FUNZIONA.md](COME_FUNZIONA.md)**.
