import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, type as typography, useTheme } from '../theme';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[typography.caption, { color: theme.textMuted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
});
