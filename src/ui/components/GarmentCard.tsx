import { Image } from 'expo-image';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MoodId } from '../../color/moods';
import { readableInk } from '../../color/space';
import { useTranslation } from '../../i18n';
import type { ArrangedGarment } from '../../store/wardrobe';
import { moodSurface } from '../moodSurface';
import { radius, spacing, type as typography, useTheme } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  garment: ArrangedGarment;
  mood: MoodId;
  colorOnly: boolean;
  onPress: () => void;
};

/**
 * La scheda poggia il capo su un fondo neutro deciso dal mood, non sul colore
 * del capo stesso: cosi' l'unica cosa colorata della griglia e' il capo, e
 * cambiare mood cambia la temperatura di tutto lo schermo senza toccare i
 * colori che contano.
 *
 * In "solo colore" il fondo torna a essere il colore firma: li' la griglia
 * deve diventare pura palette, e la foto non serve piu'.
 */
export function GarmentCard({ garment, mood, colorOnly, onPress }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const category = t.categories[garment.category];

  const background = colorOnly ? garment.signature.hex : moodSurface(mood, theme.dark);
  const ink = readableInk(background);

  // Se lo scontorno non e' riuscito ripieghiamo sulla miniatura piena, che
  // riempie la scheda: meglio una foto col suo sfondo che una scheda vuota.
  const cutout = colorOnly ? null : garment.cutoutUri;
  const photo = cutout ?? garment.thumbUri;

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
          source={{ uri: photo }}
          style={[styles.image, cutout ? styles.cutout : styles.photo]}
          // Il capo scontornato va contenuto per intero e centrato; una foto
          // con il suo sfondo riempie invece tutto lo spazio.
          contentFit={cutout ? 'contain' : 'cover'}
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
    ...StyleSheet.absoluteFill,
    marginBottom: 46,
  },
  photo: {
    margin: spacing.sm,
    marginBottom: 46,
    borderRadius: radius.md,
  },
  cutout: {
    // Il capo scontornato respira di piu' e non ha angoli da arrotondare.
    margin: spacing.md,
    marginBottom: 50,
  },
  footer: {
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
  },
});
