import { Image } from 'expo-image';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { NormalizedRect } from '../../color/subject';
import { radius } from '../theme';

type Props = {
  uri: string;
  /** Dimensioni reali della foto: servono per convertire i gesti in ritaglio. */
  imageWidth: number;
  imageHeight: number;
  /** Larghezza disponibile a schermo; l'altezza segue `aspect`. */
  width: number;
  aspect: number;
  /** Ritaglio proposto all'apertura. Assente significa inquadratura intera. */
  suggestion: NormalizedRect | null;
  onChange: (rect: NormalizedRect) => void;
};

const MAX_ZOOM = 4;

/**
 * Ritaglio per trascinamento e pizzico.
 *
 * La cornice sta ferma e si muove l'immagine sotto, invece di trascinare gli
 * angoli di un rettangolo: e' il gesto che si usa ovunque per inquadrare una
 * foto, e garantisce da solo che il ritaglio abbia sempre le proporzioni della
 * scheda in cui il capo finira'.
 */
export function CropFrame({
  uri,
  imageWidth,
  imageHeight,
  width,
  aspect,
  suggestion,
  onChange,
}: Props) {
  const height = width / aspect;

  // Ingrandimento minimo perche' l'immagine copra sempre la cornice: sotto
  // questo valore si vedrebbero i bordi vuoti.
  const cover = Math.max(width / imageWidth, height / imageHeight);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  /** Converte la posizione dell'immagine nel rettangolo che la cornice inquadra. */
  const toRect = (k: number, tx: number, ty: number): NormalizedRect => {
    'worklet';
    const displayWidth = imageWidth * cover * k;
    const displayHeight = imageHeight * cover * k;

    const rectWidth = Math.min(1, width / displayWidth);
    const rectHeight = Math.min(1, height / displayHeight);
    const x = Math.min(1 - rectWidth, Math.max(0, 0.5 - tx / displayWidth - rectWidth / 2));
    const y = Math.min(1 - rectHeight, Math.max(0, 0.5 - ty / displayHeight - rectHeight / 2));

    return { x, y, width: rectWidth, height: rectHeight };
  };

  /** Impedisce che trascinando si scoprano i bordi dell'immagine. */
  const clampTranslation = (k: number, tx: number, ty: number) => {
    'worklet';
    const limitX = Math.max(0, (imageWidth * cover * k - width) / 2);
    const limitY = Math.max(0, (imageHeight * cover * k - height) / 2);
    return {
      x: Math.min(limitX, Math.max(-limitX, tx)),
      y: Math.min(limitY, Math.max(-limitY, ty)),
    };
  };

  const report = () => {
    'worklet';
    runOnJS(onChange)(toRect(scale.value, translateX.value, translateY.value));
  };

  // Il ritaglio proposto si applica come posizione iniziale dell'immagine: il
  // capo si trova gia' inquadrato, e chi vuole ritocca da li'.
  useEffect(() => {
    if (!suggestion) {
      scale.value = withTiming(1);
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      onChange(toRect(1, 0, 0));
      return;
    }

    const fit = Math.min(
      width / (suggestion.width * imageWidth * cover),
      height / (suggestion.height * imageHeight * cover)
    );
    const k = Math.min(MAX_ZOOM, Math.max(1, fit));

    const centerX = suggestion.x + suggestion.width / 2;
    const centerY = suggestion.y + suggestion.height / 2;
    const target = clampTranslation(
      k,
      imageWidth * cover * k * (0.5 - centerX),
      imageHeight * cover * k * (0.5 - centerY)
    );

    scale.value = withTiming(k);
    translateX.value = withTiming(target.x);
    translateY.value = withTiming(target.y);
    onChange(toRect(k, target.x, target.y));
    // Il suggerimento arriva una volta sola, quando l'analisi finisce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion, width, imageWidth, imageHeight]);

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = clampTranslation(
        scale.value,
        startX.value + event.translationX,
        startY.value + event.translationY
      );
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(report);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((event) => {
      const k = Math.min(MAX_ZOOM, Math.max(1, startScale.value * event.scale));
      const next = clampTranslation(k, translateX.value, translateY.value);
      scale.value = k;
      translateX.value = next.x;
      translateY.value = next.y;
    })
    .onEnd(report);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <View style={[styles.frame, { width, height }]}>
        <Animated.View style={[styles.layer, animatedStyle]}>
          <Image
            source={{ uri }}
            style={{ width: imageWidth * cover, height: imageHeight * cover }}
            contentFit="fill"
            transition={160}
          />
        </Animated.View>
        <Guides />
      </View>
    </GestureDetector>
  );
}

/** Terzi appena accennati: aiutano a centrare senza sporcare l'anteprima. */
function Guides() {
  return (
    <View style={styles.guides} pointerEvents="none">
      <View style={[styles.line, { left: '33.33%', width: StyleSheet.hairlineWidth, top: 0, bottom: 0 }]} />
      <View style={[styles.line, { left: '66.66%', width: StyleSheet.hairlineWidth, top: 0, bottom: 0 }]} />
      <View style={[styles.line, { top: '33.33%', height: StyleSheet.hairlineWidth, left: 0, right: 0 }]} />
      <View style={[styles.line, { top: '66.66%', height: StyleSheet.hairlineWidth, left: 0, right: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#00000010',
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guides: { ...StyleSheet.absoluteFillObject },
  line: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.28)' },
});
