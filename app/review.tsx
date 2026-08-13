import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { extractSwatches, prepareGarmentImage, suggestCrop } from '../src/color/extract';
import type { Swatch } from '../src/color/quantize';
import { rankSwatches } from '../src/color/roles';
import { readableInk } from '../src/color/space';
import { FULL_FRAME, type NormalizedRect } from '../src/color/subject';
import { useTranslation, type Dictionary } from '../src/i18n';
import { getDraft, setDraft } from '../src/store/draft';
import { useWardrobe } from '../src/store/wardrobe';
import { CropFrame } from '../src/ui/components/CropFrame';
import { Field } from '../src/ui/components/Field';
import { KeyboardPadding } from '../src/ui/components/KeyboardPadding';
import { PaletteBar } from '../src/ui/components/PaletteBar';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';
import { CATEGORIES, DEFAULT_CATEGORY, type Category } from '../src/types';

/** Le schede del guardaroba sono 3:4: il ritaglio usa le stesse proporzioni. */
const CARD_ASPECT = 3 / 4;

/**
 * L'inserimento e' diviso in due passi: prima si inquadra, poi si descrive.
 *
 * Non e' solo ordine: finche' l'inquadratura non e' decisa, la palette mostrata
 * sarebbe quella della foto intera, sfondo compreso. Chiedere prima il
 * ritaglio significa che i colori che l'utente vede al passo dopo sono gia'
 * quelli veri del capo.
 */
type Step = 'frame' | 'details';

export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { addGarment } = useWardrobe();
  const { t } = useTranslation();

  const draft = useMemo(getDraft, []);

  const [step, setStep] = useState<Step>('frame');
  const [suggestion, setSuggestion] = useState<NormalizedRect | null>(null);
  const [analysing, setAnalysing] = useState(true);
  const [crop, setCrop] = useState<NormalizedRect>(FULL_FRAME);
  const [swatches, setSwatches] = useState<Swatch[] | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>(DEFAULT_CATEGORY);
  const [saving, setSaving] = useState(false);

  const ranked = useMemo(() => rankSwatches(swatches ?? []), [swatches]);
  const frameWidth = Math.min(screenWidth - spacing.lg * 2, 400);

  // Il ritaglio proposto arriva da un'analisi su una versione ridotta della
  // foto, quindi e' rapida: parte appena la schermata si apre.
  useEffect(() => {
    if (!draft) return;
    let cancelled = false;

    suggestCrop(draft.sourceUri)
      .then((proposed) => {
        if (!cancelled) setSuggestion(proposed);
      })
      .catch((cause) => console.error('Rilevamento del capo fallito', cause))
      .finally(() => {
        if (!cancelled) setAnalysing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [draft]);

  const onCropChange = useCallback((rect: NormalizedRect) => setCrop(rect), []);

  if (!draft) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t.review.noDraft}</Text>
        <PressableScale onPress={() => router.replace('/')} haptic={false}>
          <Text style={[typography.label, { color: theme.text }]}>{t.common.backToWardrobe}</Text>
        </PressableScale>
      </View>
    );
  }

  const source = draft;

  /** Passa ai dettagli leggendo la palette del solo ritaglio scelto. */
  async function confirmFrame() {
    setStep('details');
    setSwatches(null);
    try {
      setSwatches(await extractSwatches(source.sourceUri, crop));
    } catch (cause) {
      console.error('Analisi dei colori fallita', cause);
      setSwatches([]);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const prepared = await prepareGarmentImage(source.sourceUri, source.id, {
        crop,
        removeBackground,
      });
      await addGarment({
        id: source.id,
        name: name.trim() || suggestName(t, category),
        category,
        imageUri: prepared.imageUri,
        thumbUri: prepared.thumbUri,
        cutoutUri: prepared.cutoutUri,
        swatches: prepared.swatches,
      });
      setDraft(null);
      router.replace('/');
    } catch (cause) {
      console.error('Salvataggio fallito', cause);
      setSaving(false);
    }
  }

  function leave() {
    if (step === 'details') {
      setStep('frame');
      return;
    }
    setDraft(null);
    router.replace('/');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}>
        <View style={styles.topBar}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={step === 'details' ? t.common.back : t.common.cancel}
            onPress={leave}
            style={[styles.iconButton, { borderColor: theme.line }]}>
            <Ionicons
              name={step === 'details' ? 'chevron-back' : 'close'}
              size={18}
              color={theme.textMuted}
            />
          </PressableScale>
          <Text style={[typography.label, { color: theme.textMuted }]}>
            {step === 'frame' ? t.review.stepFrame : t.review.stepDetails}
          </Text>
          <View style={styles.iconButton} />
        </View>

        <StepDots active={step === 'frame' ? 0 : 1} />

        {step === 'frame' ? (
          <>
            <View style={styles.preview}>
              <CropFrame
                uri={source.sourceUri}
                imageWidth={source.width}
                imageHeight={source.height}
                width={frameWidth}
                aspect={CARD_ASPECT}
                suggestion={suggestion}
                onChange={onCropChange}
              />
              <Text style={[typography.body, styles.hint, { color: theme.textMuted }]}>
                {analysing ? t.review.detecting : t.review.cropHint}
              </Text>
            </View>

            <View style={styles.section}>
              <PressableScale
                accessibilityRole="button"
                onPress={confirmFrame}
                style={[styles.primaryButton, { backgroundColor: theme.text }]}>
                <Text style={[typography.label, { color: theme.background }]}>
                  {t.review.continue}
                </Text>
              </PressableScale>
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Field label={t.review.colorsFound}>
                {swatches === null ? (
                  <View style={styles.loading}>
                    <ActivityIndicator color={theme.textMuted} />
                    <Text style={[typography.body, { color: theme.textMuted }]}>
                      {t.capture.reading}
                    </Text>
                  </View>
                ) : (
                  <>
                    <PaletteBar swatches={ranked} height={14} />
                    <View style={styles.swatchList}>
                      {ranked.map((swatch) => (
                        <View
                          key={swatch.hex}
                          style={[styles.swatchRow, { backgroundColor: swatch.hex }]}>
                          <Text style={[typography.label, { color: readableInk(swatch.hex) }]}>
                            {swatch.hex.toUpperCase()}
                          </Text>
                          <Text
                            style={[
                              typography.caption,
                              { color: readableInk(swatch.hex), opacity: 0.75 },
                            ]}>
                            {t.roles[swatch.role].toUpperCase()} ·{' '}
                            {Math.round(swatch.share * 100)}%
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </Field>
            </View>

            <View style={styles.section}>
              <Field label={t.review.name}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={suggestName(t, category)}
                  placeholderTextColor={theme.textMuted}
                  returnKeyType="done"
                  style={[
                    typography.body,
                    styles.input,
                    { color: theme.text, borderColor: theme.line },
                  ]}
                />
              </Field>
            </View>

            <View style={styles.section}>
              <Field label={t.review.category}>
                <View style={styles.categories}>
                  {CATEGORIES.map((option) => {
                    const active = option === category;
                    return (
                      <PressableScale
                        key={option}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        onPress={() => setCategory(option)}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: active ? theme.text : 'transparent',
                            borderColor: active ? theme.text : theme.line,
                          },
                        ]}>
                        <Text
                          style={[
                            typography.label,
                            { color: active ? theme.background : theme.textMuted },
                          ]}>
                          {t.categories[option]}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
              </Field>
            </View>

            <View style={styles.section}>
              <View style={[styles.switchRow, { borderColor: theme.line }]}>
                <View style={styles.switchText}>
                  <Text style={[typography.label, { color: theme.text }]}>
                    {t.review.removeBackground}
                  </Text>
                  <Text style={[typography.body, { color: theme.textMuted }]}>
                    {t.review.removeBackgroundBody}
                  </Text>
                </View>
                <Switch value={removeBackground} onValueChange={setRemoveBackground} />
              </View>
            </View>

            <View style={styles.section}>
              <PressableScale
                accessibilityRole="button"
                onPress={save}
                disabled={saving}
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.text, opacity: saving ? 0.6 : 1 },
                ]}>
                <Text style={[typography.label, { color: theme.background }]}>
                  {saving ? t.review.saving : t.review.save}
                </Text>
              </PressableScale>
            </View>
          </>
        )}

        {/* Riserva in coda lo spazio della tastiera, cosi' il campo su cui si
            sta scrivendo resta sempre raggiungibile scorrendo. */}
        <KeyboardPadding extra={spacing.lg} />
      </ScrollView>
    </View>
  );
}

function StepDots({ active }: { active: number }) {
  const theme = useTheme();
  return (
    <View style={styles.dots}>
      {[0, 1].map((index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index === active ? theme.text : theme.line,
              width: index === active ? 20 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Il nome proposto e' la categoria stessa, che e' gia' un'etichetta sensata. */
const suggestName = (t: Dictionary, category: Category) =>
  category === DEFAULT_CATEGORY ? t.review.unnamed : t.categories[category];

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  dot: { height: 6, borderRadius: radius.pill },
  preview: { paddingHorizontal: spacing.lg, gap: spacing.md },
  hint: { textAlign: 'center' },
  section: { paddingHorizontal: spacing.lg },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  swatchList: { gap: spacing.sm, marginTop: spacing.sm },
  swatchRow: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  input: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  switchText: { flex: 1, gap: spacing.xs },
  primaryButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
