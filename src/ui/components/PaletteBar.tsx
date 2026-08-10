import React from 'react';
import { StyleSheet, View } from 'react-native';

import type { Swatch } from '../../color/quantize';
import { radius } from '../theme';

type Props = {
  swatches: Pick<Swatch, 'hex' | 'share'>[];
  height?: number;
  rounded?: boolean;
};

/**
 * Striscia di colore in cui ogni segmento e' largo quanto la sua quota.
 * E' il modo piu' diretto per far vedere "di che colore e'" un capo o un intero
 * guardaroba senza chiedere di leggere numeri.
 */
export function PaletteBar({ swatches, height = 10, rounded = true }: Props) {
  if (swatches.length === 0) return null;

  const total = swatches.reduce((sum, swatch) => sum + swatch.share, 0) || 1;

  return (
    <View style={[styles.bar, { height, borderRadius: rounded ? radius.pill : 0 }]}>
      {swatches.map((swatch, index) => (
        <View
          key={`${swatch.hex}-${index}`}
          style={{ flex: swatch.share / total, backgroundColor: swatch.hex }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
});
