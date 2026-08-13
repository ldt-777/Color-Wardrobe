import React from 'react';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Spazio che cresce quanto la tastiera, in fondo a una lista scorrevole.
 *
 * `KeyboardAvoidingView` non basta piu' su Android: con l'interfaccia a tutto
 * schermo il sistema non ridimensiona piu' la finestra, quindi il campo di
 * testo finisce sotto la tastiera. Leggere l'altezza reale e riservarla come
 * spazio in coda risolve allo stesso modo su entrambe le piattaforme.
 */
export function KeyboardPadding({ extra = 0 }: { extra?: number }) {
  const keyboard = useAnimatedKeyboard();

  const style = useAnimatedStyle(() => ({
    height: keyboard.height.value > 0 ? keyboard.height.value + extra : 0,
  }));

  return <Animated.View style={style} pointerEvents="none" />;
}
