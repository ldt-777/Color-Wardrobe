import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rankSwatches } from '../src/color/roles';
import { readableInk } from '../src/color/space';
import { getDraft, setDraft } from '../src/store/draft';
import { useWardrobe } from '../src/store/wardrobe';
import { Field } from '../src/ui/components/Field';
import { PaletteBar } from '../src/ui/components/PaletteBar';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';
import { CATEGORIES, type Category } from '../src/types';

const ROLE_LABELS: Record<string, string> = {
  base: 'colore base',
  secondario: 'secondario',
  accento: 'accento',
  neutro: 'neutro',
};

export default function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addGarment } = useWardrobe();

  const draft = useMemo(getDraft, []);
  const ranked = useMemo(() => rankSwatches(draft?.swatches ?? []), [draft]);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Altro');
  const [saving, setSaving] = useState(false);

  if (!draft) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>
          Nessuna foto da salvare.
        </Text>
        <PressableScale onPress={() => router.replace('/')} haptic={false}>
          <Text style={[typography.label, { color: theme.text }]}>Torna al guardaroba</Text>
        </PressableScale>
      </View>
    );
  }

  async function save() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      await addGarment({
        id: draft.id,
        name: name.trim() || suggestName(category),
        category,
        imageUri: draft.imageUri,
        thumbUri: draft.thumbUri,
        swatches: draft.swatches,
      });
      setDraft(null);
      router.replace('/');
    } catch (cause) {
      console.error('Salvataggio fallito', cause);
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.lg,
        }}>
        <View style={styles.topBar}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Annulla"
            onPress={() => {
              setDraft(null);
              router.replace('/');
            }}
            style={[styles.iconButton, { borderColor: theme.line }]}>
            <Ionicons name="close" size={18} color={theme.textMuted} />
          </PressableScale>
          <Text style={[typography.label, { color: theme.textMuted }]}>Nuovo capo</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.preview}>
          <Image source={{ uri: draft.thumbUri }} style={styles.photo} contentFit="cover" />
          <PaletteBar swatches={ranked} height={14} />
        </View>

        <View style={styles.section}>
          <Field label="I colori che ho letto">
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
                    {ROLE_LABELS[swatch.role].toUpperCase()} · {Math.round(swatch.share * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          </Field>
        </View>

        <View style={styles.section}>
          <Field label="Nome">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={suggestName(category)}
              placeholderTextColor={theme.textMuted}
              style={[
                typography.body,
                styles.input,
                { color: theme.text, borderColor: theme.line },
              ]}
            />
          </Field>
        </View>

        <View style={styles.section}>
          <Field label="Categoria">
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
                      {option}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </Field>
        </View>

        <View style={styles.section}>
          <PressableScale
            accessibilityRole="button"
            onPress={save}
            disabled={saving}
            style={[styles.saveButton, { backgroundColor: theme.text, opacity: saving ? 0.6 : 1 }]}>
            <Text style={[typography.label, { color: theme.background }]}>
              {saving ? 'Salvo…' : 'Salva nel guardaroba'}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const suggestName = (category: Category) => (category === 'Altro' ? 'Capo senza nome' : category);

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: spacing.md },
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
  preview: { paddingHorizontal: spacing.lg, gap: spacing.md },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg },
  section: { paddingHorizontal: spacing.lg },
  swatchList: { gap: spacing.sm },
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
  saveButton: {
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
});
