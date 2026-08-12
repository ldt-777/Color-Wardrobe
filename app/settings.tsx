import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LANGUAGE_NAMES, LANGUAGES, useTranslation, type Language } from '../src/i18n';
import { useWardrobe } from '../src/store/wardrobe';
import { Field } from '../src/ui/components/Field';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { moods, settings, pinMood, setColorOnly, setLanguage } = useWardrobe();
  const { t, language } = useTranslation();

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
          accessibilityLabel={t.common.back}
          onPress={() => router.back()}
          style={[styles.iconButton, { borderColor: theme.line }]}>
          <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
        </PressableScale>
        <Text style={[typography.label, { color: theme.textMuted }]}>{t.settings.title}</Text>
        <View style={styles.iconButton} />
      </View>

      <View style={styles.section}>
        <Field label={t.settings.language}>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            {t.settings.languageBody}
          </Text>

          <View style={styles.optionList}>
            <Option
              label={t.settings.languageSystem}
              // Quando la lingua segue il telefono mostriamo quale ha scelto:
              // "Come il telefono" da solo non dice in che lingua si finisce.
              description={`${t.settings.languageSystemBody} · ${LANGUAGE_NAMES[language]}`}
              active={settings.language === null}
              onPress={() => setLanguage(null)}
            />
            {LANGUAGES.map((code: Language) => (
              <Option
                key={code}
                label={LANGUAGE_NAMES[code]}
                active={settings.language === code}
                onPress={() => setLanguage(code)}
              />
            ))}
          </View>
        </Field>
      </View>

      <View style={styles.section}>
        <Field label={t.settings.pinnedMood}>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            {t.settings.pinnedMoodBody}
          </Text>

          <View style={styles.optionList}>
            <Option
              label={t.settings.pinnedMoodNone}
              description={t.settings.pinnedMoodNoneBody}
              active={settings.pinnedMoodId === null}
              onPress={() => pinMood(null)}
            />
            {moods.map((mood) => (
              <Option
                key={mood.id}
                label={t.moods[mood.id].name}
                description={t.moods[mood.id].tagline}
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
            <Text style={[typography.label, { color: theme.text }]}>{t.settings.colorOnly}</Text>
            <Text style={[typography.body, { color: theme.textMuted }]}>
              {t.settings.colorOnlyBody}
            </Text>
          </View>
          <Switch value={settings.colorOnly} onValueChange={setColorOnly} />
        </View>
      </View>

      <View style={styles.section}>
        <Field label={t.settings.privacy}>
          <Text style={[typography.body, { color: theme.textMuted }]}>
            {t.settings.privacyBody}
          </Text>
        </Field>
      </View>
    </ScrollView>
  );
}

function Option({
  label,
  description,
  active,
  onPress,
}: {
  label: string;
  description?: string;
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
        styles.option,
        {
          borderColor: active ? theme.text : theme.line,
          backgroundColor: active ? theme.surfaceMuted : 'transparent',
        },
      ]}>
      <View style={styles.optionText}>
        <Text style={[typography.label, { color: theme.text }]}>{label}</Text>
        {description ? (
          <Text style={[typography.caption, { color: theme.textMuted }]}>{description}</Text>
        ) : null}
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
  optionList: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  optionText: { flex: 1, gap: 2 },
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
