import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Mood } from '../../color/moods';
import { radius, spacing, type as typography, useTheme } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  moods: Mood[];
  activeId: string;
  pinnedId: string | null;
  onSelect: (moodId: string) => void;
};

export function MoodPicker({ moods, activeId, pinnedId, onSelect }: Props) {
  const theme = useTheme();

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}>
        {moods.map((mood) => {
          const active = mood.id === activeId;
          return (
            <PressableScale
              key={mood.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Mood ${mood.name}. ${mood.tagline}`}
              onPress={() => onSelect(mood.id)}
              style={[
                styles.chip,
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
                {mood.name}
                {mood.id === pinnedId ? ' ·' : ''}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
