import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useWardrobe } from '../src/store/wardrobe';
import { Field } from '../src/ui/components/Field';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { moods, settings, pinMood, setColorOnly } = useWardrobe();

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.xl,
      }}>
      <View style={styles.topBar}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Indietro"
          onPress={() => router.back()}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
        </PressableScale>
        <Text style={[typography.label, { color: theme.textMuted }]}>Impostazioni</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.section}>
        <Field label="Mood fisso">
          <Text style={[typography.body, { color: theme.textMuted }]}>
            Con un mood fisso il guardaroba si ordina sempre allo stesso modo e i pulsanti in alto
            spariscono. Senza, puoi cambiare mood quando vuoi.
          </Text>

          <View style={styles.moodList}>
            <MoodOption
              label="Nessuno"
              description="Scelgo di volta in volta"
              active={settings.pinnedMoodId === null}
              onPress={() => pinMood(null)}
            />
            {moods.map((mood) => (
              <MoodOption
                key={mood.id}
                label={mood.name}
                description={mood.tagline}
                active={settings.pinnedMoodId === mood.id}
                onPress={() => pinMood(mood.id)}
              />
            ))}
          </View>
        </Field>
      </View>

      <View style={styles.section}>
        <View style={[styles.switchRow, { borderColor: theme.line }]}>
          <View style={styles.switchText}>
            <Text style={[typography.label, { color: theme.text }]}>Solo colore</Text>
            <Text style={[typography.body, { color: theme.textMuted }]}>
              Nasconde le foto e lascia il guardaroba come pura griglia di colori.
            </Text>
          </View>
          <Switch value={settings.colorOnly} onValueChange={setColorOnly} />
        </View>
      </View>

      <View style={styles.section}>
        <Field label="Dove finiscono le foto">
          <Text style={[typography.body, { color: theme.textMuted }]}>
            Tutto resta su questo telefono: le immagini in una cartella privata dell app e i colori
            in un database locale. Niente account, niente rete.
          </Text>
        </Field>
      </View>
    </ScrollView>
  );
}

function MoodOption({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.moodOption,
        {
          borderColor: active ? theme.text : theme.line,
          backgroundColor: active ? theme.surfaceMuted : 'transparent',
        },
      ]}>
      <View style={styles.moodText}>
        <Text style={[typography.label, { color: theme.text }]}>{label}</Text>
        <Text style={[typography.caption, { color: theme.textMuted }]}>{description}</Text>
      </View>
      {active && <Ionicons name="checkmark" size={18} color={theme.text} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
  section: { paddingHorizontal: spacing.lg, gap: spacing.md },
  moodList: { gap: spacing.sm },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  moodText: { flex: 1, gap: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  switchText: { flex: 1, gap: spacing.xs },
});
