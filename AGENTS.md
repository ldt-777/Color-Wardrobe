# Color Wardrobe — note per chi ci lavora

Expo SDK 57 / React Native 0.86 / expo-router. Prima di scrivere codice Expo,
i documenti giusti sono quelli versionati: https://docs.expo.dev/versions/v57.0.0/

## Convenzioni

- **Il motore colore (`src/color/`) non importa React Native.** È quello che
  permette a `npm test` di girare su Node senza simulatore. L'unica eccezione
  sono `decode.ts` ed `extract.ts`, che toccano il filesystem e la fotocamera e
  infatti restano fuori dai test.
- **Si ragiona in OKLab, non in HSL.** Qualsiasi confronto, ordinamento o
  raggruppamento di colori passa da `src/color/space.ts`.
- **L'interfaccia non ha colori propri.** La palette in `src/ui/theme.ts` è fatta
  solo di grigi caldi: il colore lo mettono i capi.
- Import senza estensione (li risolve Metro). I test vengono compilati prima da
  `tsc -p tsconfig.test.json`, per questo funzionano lo stesso.

## Prima di considerare finito un cambiamento

```bash
npm test           # motore colore
npm run typecheck
npx expo export --platform android   # verifica che il bundle si costruisca
```
