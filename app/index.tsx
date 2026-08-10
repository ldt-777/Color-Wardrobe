import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWardrobe } from '../src/store/wardrobe';
import { GarmentCard } from '../src/ui/components/GarmentCard';
import { MoodPicker } from '../src/ui/components/MoodPicker';
import { PaletteBar } from '../src/ui/components/PaletteBar';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';

const COLUMNS = 2;

export default function WardrobeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { ready, arranged, context, mood, moods, settings, selectMood, setColorOnly } =
    useWardrobe();

  const cardWidth = (width - spacing.lg * 2 - spacing.md * (COLUMNS - 1)) / COLUMNS;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: insets.bottom + 120,
        }}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={[typography.display, { color: theme.text }]}>Guardaroba</Text>
            <Text style={[typography.body, { color: theme.textMuted }]}>
              {arranged.length === 0
                ? 'Ancora vuoto'
                : `${arranged.length} ${arranged.length === 1 ? 'capo' : 'capi'} · ${mood.tagline.toLowerCase()}`}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={settings.colorOnly ? 'Mostra le foto' : 'Mostra solo i colori'}
              onPress={() => setColorOnly(!settings.colorOnly)}
              style={[styles.iconButton, { borderColor: theme.line }]}>
              <Ionicons
                name={settings.colorOnly ? 'image-outline' : 'color-palette-outline'}
                size={18}
                color={theme.textMuted}
              />
            </PressableScale>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Impostazioni"
              onPress={() => router.push('/settings')}
              style={[styles.iconButton, { borderColor: theme.line }]}>
              <Ionicons name="options-outline" size={18} color={theme.textMuted} />
            </PressableScale>
          </View>
        </View>

        {context.families.length > 0 && (
          <Animated.View entering={FadeIn} style={styles.paletteBlock}>
            <PaletteBar swatches={context.families} height={12} />
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              LE FAMIGLIE DI COLORE DEL TUO GUARDAROBA
            </Text>
          </Animated.View>
        )}

        {!settings.pinnedMoodId && (
          <MoodPicker moods={moods} activeId={mood.id} pinnedId={null} onSelect={selectMood} />
        )}

        {settings.pinnedMoodId && (
          <View style={styles.pinnedRow}>
            <Text style={[typography.label, { color: theme.textMuted }]}>
              Mood fisso · {mood.name}
            </Text>
            <PressableScale onPress={() => router.push('/settings')} haptic={false}>
              <Text style={[typography.label, { color: theme.text }]}>Cambia</Text>
            </PressableScale>
          </View>
        )}

        {ready && arranged.length === 0 ? (
          <EmptyState onPress={() => router.push('/capture')} />
        ) : (
          <View style={styles.grid}>
            {arranged.map((garment) => (
              <Animated.View
                key={garment.id}
                layout={LinearTransition.springify().damping(20).stiffness(160)}
                entering={FadeIn.duration(260)}
                style={{ width: cardWidth }}>
                <GarmentCard
                  garment={garment}
                  colorOnly={settings.colorOnly}
                  onPress={() => router.push(`/garment/${garment.id}`)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.fabWrapper, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Aggiungi un capo"
          onPress={() => router.push('/capture')}
          style={[styles.fab, { backgroundColor: theme.text }]}>
          <Ionicons name="camera-outline" size={24} color={theme.background} />
        </PressableScale>
      </View>
    </View>
  );
}

function EmptyState({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[typography.title, { color: theme.text, textAlign: 'center' }]}>
        Il colore comincia da un capo
      </Text>
      <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>
        Fotografa qualcosa che indossi spesso. Ne leggo i colori e da li' costruisco la palette del
        tuo guardaroba.
      </Text>
      <PressableScale
        onPress={onPress}
        style={[styles.emptyButton, { backgroundColor: theme.text }]}>
        <Text style={[typography.label, { color: theme.background }]}>Scatta la prima foto</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerText: { flex: 1, gap: spacing.xs },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
  },
  emptyButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  fabWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
