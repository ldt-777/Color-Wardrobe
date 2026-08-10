import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { prepareGarmentImage } from '../src/color/extract';
import { setDraft } from '../src/store/draft';
import { PressableScale } from '../src/ui/components/PressableScale';
import { radius, spacing, type as typography, useTheme } from '../src/ui/theme';

const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export default function CaptureScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function process(sourceUri: string) {
    setBusy(true);
    setError(null);
    try {
      const id = newId();
      const prepared = await prepareGarmentImage(sourceUri, id);
      setDraft({ id, sourceUri, ...prepared });
      router.replace('/review');
    } catch (cause) {
      console.error('Analisi della foto fallita', cause);
      setError('Non sono riuscito a leggere i colori di questa foto. Riprova.');
      setBusy(false);
    }
  }

  async function shoot() {
    const photo = await camera.current?.takePictureAsync({ quality: 0.9, skipProcessing: false });
    if (photo?.uri) await process(photo.uri);
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) await process(result.assets[0].uri);
  }

  if (!permission) return <View style={[styles.screen, { backgroundColor: '#000' }]} />;

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[typography.title, { color: theme.text, textAlign: 'center' }]}>
          Serve la fotocamera
        </Text>
        <Text style={[typography.body, { color: theme.textMuted, textAlign: 'center' }]}>
          Le foto restano sul telefono: servono solo per leggere i colori dei tuoi capi.
        </Text>
        <PressableScale
          onPress={requestPermission}
          style={[styles.primaryButton, { backgroundColor: theme.text }]}>
          <Text style={[typography.label, { color: theme.background }]}>Consenti</Text>
        </PressableScale>
        <PressableScale onPress={() => router.back()} haptic={false}>
          <Text style={[typography.label, { color: theme.textMuted }]}>Non ora</Text>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: '#000' }]}>
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} />

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color="#FFFFFF" />
          <Text style={[typography.label, styles.busyText]}>Leggo i colori…</Text>
        </View>
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Chiudi"
          onPress={() => router.back()}
          style={styles.ghostButton}>
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Cambia fotocamera"
          onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
          style={styles.ghostButton}>
          <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        </PressableScale>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.xl }]}>
        {error ? (
          <Text style={[typography.label, styles.error]}>{error}</Text>
        ) : (
          <Text style={[typography.label, styles.hint]}>
            Inquadra il capo su un fondo semplice
          </Text>
        )}

        <View style={styles.controls}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Scegli dalla galleria"
            onPress={pickFromLibrary}
            disabled={busy}
            style={styles.ghostButton}>
            <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Scatta"
            onPress={shoot}
            disabled={busy}
            style={styles.shutter}>
            <View style={styles.shutterInner} />
          </PressableScale>

          {/* Segnaposto della stessa misura del pulsante galleria: tiene lo
              scatto centrato senza aggiungere un comando in piu'. */}
          <View style={styles.ghostButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  primaryButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  bottomBar: {
    marginTop: 'auto',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostButton: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
  },
  hint: { color: 'rgba(255, 255, 255, 0.75)', textAlign: 'center' },
  error: { color: '#FFC9C0', textAlign: 'center' },
  busy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  busyText: { color: '#FFFFFF' },
});
