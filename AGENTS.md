# Color Wardrobe — note per chi ci lavora

Expo SDK 54 / React Native 0.81 / expo-router. Prima di scrivere codice Expo,
i documenti giusti sono quelli versionati: https://docs.expo.dev/versions/v54.0.0/

## Convenzioni

- **Il motore colore (`src/color/`) non importa React Native.** È quello che
  permette a `npm test` di girare su Node senza simulatore. L'unica eccezione
  sono `decode.ts` ed `extract.ts`, che toccano il filesystem e la fotocamera e
  infatti restano fuori dai test.
- **Si ragiona in OKLab, non in HSL.** Qualsiasi confronto, ordinamento o
  raggruppamento di colori passa da `src/color/space.ts`.
- **L'interfaccia non ha colori propri.** La palette in `src/ui/theme.ts` è fatta
  solo di grigi caldi, e i fondi delle schede in `src/ui/moodSurface.ts` restano
  sotto la soglia di croma in cui l'occhio legge una tinta: il colore lo mettono
  i capi.
- Import senza estensione (li risolve Metro). I test vengono compilati prima da
  `tsc -p tsconfig.test.json`, per questo funzionano lo stesso.
- **Nessuna stringa scritta a mano nelle schermate.** Tutto quello che l'utente
  legge sta in `src/i18n/translations.ts`, dove l'italiano fa da tipo: se manca
  una voce in inglese o spagnolo, il typecheck fallisce. Fanno eccezione i
  `console.error`, che parlano a noi.
- **Nel database vanno identificatori, non etichette.** Categorie, ruoli e mood
  sono salvati come `knitwear`, `accento`, `flusso`; il testo mostrato arriva
  dalle traduzioni. Aggiungere una categoria significa toccare `src/types.ts`,
  i tre dizionari e, se ne rinomini una esistente, una migrazione in
  `src/db/index.ts`.

## Prima di considerare finito un cambiamento

```bash
npm test           # motore colore
npm run typecheck
npx expo export --platform android   # verifica che il bundle si costruisca
```
