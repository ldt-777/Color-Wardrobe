import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { readableInk } from '../../src/color/space';
import { fill, useTranslation } from '../../src/i18n';
import { useWardrobe } from '../../src/store/wardrobe';
import { Field } from '../../src/ui/components/Field';
import { PaletteBar } from '../../src/ui/components/PaletteBar';
import { PressableScale } from '../../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../../src/ui/theme';

export default function GarmentScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { arranged, mood, removeGarment, matchesFor } = useWardrobe();
  const { t } = useTranslation();

  const garment = arranged.find((item) => item.id === id);

  if (!garment) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[typography.body, { color: theme.textMuted }]}>{t.garment.notFound}</Text>
        <PressableScale onPress={() => router.replace('/')} haptic={false}>
          <Text style={[typography.label, { color: theme.text }]}>{t.common.backToWardrobe}</Text>
        </PressableScale>
      </View>
    );
  }

  const matches = matchesFor(garment.id, 6);

  function confirmDelete() {
    if (!garment) return;
    Alert.alert(t.garment.deleteTitle, t.garment.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
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
          accessibilityLabel={t.common.back}
          onPress={() => router.back()}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.garment.deleteAction}
          onPress={confirmDelete}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
        </PressableScale>
      </View>

      <View style={styles.hero}>
        <Image source={{ uri: garment.imageUri }} style={styles.photo} contentFit="cover" />
        <View style={styles.heroText}>
          <Text style={[typography.title, { color: theme.text }]}>{garment.name}</Text>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            {t.categories[garment.category]}
          </Text>
        </View>
        <PaletteBar swatches={garment.swatches} height={14} />
      </View>

      <View style={styles.section}>
        <Field label={t.garment.palette}>
          <View style={styles.swatchList}>
            {garment.swatches.map((swatch) => (
              <View key={swatch.hex} style={[styles.swatchRow, { backgroundColor: swatch.hex }]}>
                <Text style={[typography.label, { color: readableInk(swatch.hex) }]}>
                  {t.roles[swatch.role]}
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
        <Field label={t.garment.inWardrobe}>
          <View style={[styles.metrics, { borderColor: theme.line }]}>
            <Metric
              label={t.garment.versatility}
              value={`${Math.round(garment.stats.versatility * 100)}%`}
              hint={t.garment.versatilityHint}
            />
            <Metric
              label={t.garment.rarity}
              value={`${Math.round(garment.stats.rarity * 100)}%`}
              hint={t.garment.rarityHint}
            />
            <Metric
              label={fill(t.garment.moodAffinity, { mood: t.moods[mood.id].name })}
              value={`${Math.round(garment.affinity * 100)}%`}
              hint={t.garment.moodAffinityHint}
            />
          </View>
        </Field>
      </View>

      {matches.length > 0 && (
        <View style={styles.section}>
          <Field label={t.garment.matches}>
            <View style={styles.matches}>
              {matches.map(({ garment: other, score }) => (
                <PressableScale
                  key={other.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${other.name} · ${Math.round(score * 100)}%`}
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
