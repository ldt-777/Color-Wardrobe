import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ArrangedGarment } from '../../store/wardrobe';
import { readableInk } from '../../color/space';
import { useTranslation } from '../../i18n';
import { radius, spacing, type as typography } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  garment: ArrangedGarment;
  colorOnly: boolean;
  onPress: () => void;
};

/**
 * La scheda e' costruita attorno al colore, non attorno alla foto: il fondo e'
 * il colore firma del capo e la foto ci galleggia dentro con un margine. Messe
 * in griglia, le schede formano un mosaico che si legge come una palette.
 */
export function GarmentCard({ garment, colorOnly, onPress }: Props) {
  const { t } = useTranslation();
  const category = t.categories[garment.category];
  const background = garment.signature.hex;
  const ink = readableInk(background);

  // I capi lontani dal mood attivo arretrano invece di sparire: il guardaroba
  // resta tutto li', ma l'occhio sa dove guardare.
  const opacity = 0.58 + 0.42 * garment.affinity;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${garment.name}, ${category}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: background, opacity }]}>
      {!colorOnly && (
        <Image
          source={{ uri: garment.thumbUri }}
          style={styles.image}
          contentFit="cover"
          transition={220}
          cachePolicy="memory-disk"
        />
      )}

      <View style={styles.footer}>
        <Text numberOfLines={1} style={[typography.label, { color: ink }]}>
          {garment.name}
        </Text>
        <Text numberOfLines={1} style={[typography.caption, { color: ink, opacity: 0.7 }]}>
          {category.toUpperCase()}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    overflow: 'hidden',
    padding: spacing.sm,
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    margin: spacing.sm,
    marginBottom: 46,
    borderRadius: radius.md,
  },
  footer: {
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
