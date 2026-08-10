import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readableInk } from '../../src/color/space';
import { useWardrobe } from '../../src/store/wardrobe';
import { Field } from '../../src/ui/components/Field';
import { PaletteBar } from '../../src/ui/components/PaletteBar';
import { PressableScale } from '../../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../../src/ui/theme';

const ROLE_LABELS: Record<string, string> = {
  base: 'Colore base',
  secondario: 'Secondario',
  accento: 'Accento',
  neutro: 'Neutro',
};

export default function GarmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { arranged, mood, removeGarment, matchesFor } = useWardrobe();

  const garment = arranged.find((item) => item.id === id);

  if (!garment) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>Capo non trovato.</Text>
        <PressableScale onPress={() => router.replace('/')} haptic={false}>
          <Text style={[typography.label, { color: theme.text }]}>Torna al guardaroba</Text>
        </PressableScale>
      </View>
    );
  }

  const matches = matchesFor(garment.id, 6);

  function confirmDelete() {
    if (!garment) return;
    Alert.alert('Eliminare questo capo?', 'La foto e i suoi colori verranno rimossi.', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          await removeGarment(garment.id);
          router.replace('/');
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}>
      <View style={styles.topBar}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Indietro"
          onPress={() => router.back()}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Elimina capo"
          onPress={confirmDelete}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </PressableScale>
      </View>

      <View style={styles.hero}>
        <Image source={{ uri: garment.imageUri }} style={styles.photo} contentFit="cover" />
        <View style={styles.heroText}>
          <Text style={[typography.title, { color: theme.text }]}>{garment.name}</Text>
          <Text style={[typography.body, { color: theme.textMuted }]}>{garment.category}</Text>
        </View>
        <PaletteBar swatches={garment.swatches} height={14} />
      </View>

      <View style={styles.section}>
        <Field label="Palette del capo">
          <View style={styles.swatchList}>
            {garment.swatches.map((swatch) => (
              <View key={swatch.hex} style={[styles.swatchRow, { backgroundColor: swatch.hex }]}>
                <Text style={[typography.label, { color: readableInk(swatch.hex) }]}>
                  {ROLE_LABELS[swatch.role]}
                </Text>
                <Text
                  style={[typography.caption, { color: readableInk(swatch.hex), opacity: 0.75 }]}>
                  {swatch.hex.toUpperCase()} · {Math.round(swatch.share * 100)}%
                </Text>
              </View>
            ))}
          </View>
        </Field>
      </View>

      <View style={styles.section}>
        <Field label="Nel tuo guardaroba">
          <View style={[styles.metrics, { borderColor: theme.line }]}>
            <Metric
              label="Versatilita"
              value={`${Math.round(garment.stats.versatility * 100)}%`}
              hint="dei capi ci si abbina"
            />
            <Metric
              label="Rarita"
              value={`${Math.round(garment.stats.rarity * 100)}%`}
              hint="quanto e un colore fuori dal coro"
            />
            <Metric
              label={`Mood ${mood.name}`}
              value={`${Math.round(garment.affinity * 100)}%`}
              hint="quanto rientra nel mood attivo"
            />
          </View>
        </Field>
      </View>

      {matches.length > 0 && (
        <View style={styles.section}>
          <Field label="Ci sta bene con">
            <View style={styles.matches}>
              {matches.map(({ garment: other, score }) => (
                <PressableScale
                  key={other.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${other.name}, affinita ${Math.round(score * 100)} percento`}
                  onPress={() => router.replace(`/garment/${other.id}`)}
                  style={styles.match}>
                  <View
                    style={[styles.matchColor, { backgroundColor: other.signature.hex }]}
                  />
                  <Text numberOfLines={1} style={[typography.label, { color: theme.text }]}>
                    {other.name}
                  </Text>
                  <Text style={[typography.caption, { color: theme.textMuted }]}>
                    {Math.round(score * 100)}%
                  </Text>
                </PressableScale>
              ))}
            </View>
          </Field>
        </View>
      )}
    </ScrollView>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metric}>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label.toUpperCase()}</Text>
      <Text style={[typography.title, { color: theme.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  topBar: {
    flexDirection: 'row',
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
  hero: { paddingHorizontal: spacing.lg, gap: spacing.md },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.lg },
  heroText: { gap: spacing.xs },
  section: { paddingHorizontal: spacing.lg },
  swatchList: { gap: spacing.sm },
  swatchRow: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  metric: { flex: 1, gap: spacing.xs },
  matches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  match: { width: 92, gap: spacing.xs },
  matchColor: { width: 92, height: 92, borderRadius: radius.md },
});
