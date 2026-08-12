import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { arrangeGarments, type Arrangeable } from '../color/arrange';
import { harmonyScore } from '../color/harmony';
import type { Swatch } from '../color/quantize';
import {
  buildWardrobeContext,
  type GarmentStats,
  type RankedSwatch,
  type WardrobeContext,
} from '../color/roles';
import { findMood, MOODS, type Mood } from '../color/moods';
import type { Oklch } from '../color/space';
import * as repository from '../db/garments';
import { DEFAULT_SETTINGS, loadSettings, saveSetting, type AppSettings } from '../db/settings';
import type { Language } from '../i18n/translations';
import type { Category, Garment } from '../types';

export type ArrangedGarment = Garment & {
  signature: RankedSwatch;
  stats: GarmentStats;
  /** Quanto il capo appartiene al mood attivo, 0..1. */
  affinity: number;
};

type WardrobeValue = {
  ready: boolean;
  garments: Garment[];
  /** I capi nell'ordine ideale per il mood attivo. */
  arranged: ArrangedGarment[];
  context: WardrobeContext;
  mood: Mood;
  moods: Mood[];
  settings: AppSettings;
  selectMood: (moodId: string) => void;
  pinMood: (moodId: string | null) => Promise<void>;
  setColorOnly: (value: boolean) => Promise<void>;
  setLanguage: (language: Language | null) => Promise<void>;
  addGarment: (input: {
    id: string;
    name: string;
    category: Category;
    imageUri: string;
    thumbUri: string;
    cutoutUri: string | null;
    swatches: Swatch[];
  }) => Promise<void>;
  removeGarment: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  /** I capi che si abbinano meglio a quello dato, dal migliore in giu'. */
  matchesFor: (id: string, limit?: number) => { garment: ArrangedGarment; score: number }[];
};

const WardrobeStore = createContext<WardrobeValue | null>(null);

const FALLBACK_SIGNATURE: RankedSwatch = {
  hex: '#9C9A94',
  lab: { L: 0.66, a: 0, b: 0.004 },
  lch: { L: 0.66, C: 0.004, h: 0 },
  share: 1,
  role: 'base',
  salience: 0,
};

export function WardrobeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [garments, setGarments] = useState<Garment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [storedGarments, storedSettings] = await Promise.all([
        repository.listGarments(),
        loadSettings(),
      ]);
      if (cancelled) return;
      setGarments(storedGarments);
      setSettings(storedSettings);
      setReady(true);
    })().catch((error) => {
      console.error('Guardaroba non caricato', error);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Il mood fisso vince sempre: e' esattamente la garanzia che l'utente chiede
  // impostandolo, cioe' che la palette si comporti sempre allo stesso modo.
  const mood = useMemo(
    () => findMood(settings.pinnedMoodId ?? selectedMoodId),
    [settings.pinnedMoodId, selectedMoodId]
  );

  const signatures = useMemo(
    () =>
      garments.map((garment) => ({
        id: garment.id,
        signature: garment.swatches[0] ?? FALLBACK_SIGNATURE,
      })),
    [garments]
  );

  const context = useMemo(
    () =>
      buildWardrobeContext(
        signatures.map(({ id, signature }) => ({ id, signature: signature.lch }))
      ),
    [signatures]
  );

  const arranged = useMemo<ArrangedGarment[]>(() => {
    const enriched = garments.flatMap((garment) => {
      const stats = context.stats.get(garment.id);
      if (!stats) return [];
      const signature = garment.swatches[0] ?? FALLBACK_SIGNATURE;
      return [{ ...garment, signature, stats, affinity: mood.affinity(stats) }];
    });

    const order = arrangeGarments(
      enriched.map<Arrangeable>((garment) => ({
        id: garment.id,
        signature: garment.signature.lch,
        stats: garment.stats,
      })),
      mood.arrangement
    );

    const byId = new Map(enriched.map((garment) => [garment.id, garment]));
    return order.flatMap((item) => {
      const garment = byId.get(item.id);
      return garment ? [garment] : [];
    });
  }, [garments, context, mood]);

  const selectMood = useCallback((moodId: string) => setSelectedMoodId(moodId), []);

  const pinMood = useCallback(async (moodId: string | null) => {
    setSettings((current) => ({ ...current, pinnedMoodId: moodId }));
    await saveSetting('pinnedMoodId', moodId);
  }, []);

  const setColorOnly = useCallback(async (value: boolean) => {
    setSettings((current) => ({ ...current, colorOnly: value }));
    await saveSetting('colorOnly', value);
  }, []);

  const setLanguage = useCallback(async (language: Language | null) => {
    setSettings((current) => ({ ...current, language }));
    await saveSetting('language', language);
  }, []);

  const addGarment = useCallback<WardrobeValue['addGarment']>(async (input) => {
    const saved = await repository.insertGarment(input);
    setGarments((current) => [saved, ...current]);
  }, []);

  const removeGarment = useCallback(async (id: string) => {
    await repository.deleteGarment(id);
    setGarments((current) => current.filter((garment) => garment.id !== id));
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    await repository.renameGarment(id, name);
    setGarments((current) =>
      current.map((garment) => (garment.id === id ? { ...garment, name } : garment))
    );
  }, []);

  const matchesFor = useCallback<WardrobeValue['matchesFor']>(
    (id, limit = 6) => {
      const subject = arranged.find((garment) => garment.id === id);
      if (!subject) return [];

      return arranged
        .filter((garment) => garment.id !== id)
        .map((garment) => ({
          garment,
          score: harmonyScore(subject.signature.lch, garment.signature.lch),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    },
    [arranged]
  );

  const value = useMemo<WardrobeValue>(
    () => ({
      ready,
      garments,
      arranged,
      context,
      mood,
      moods: MOODS,
      settings,
      selectMood,
      pinMood,
      setColorOnly,
      setLanguage,
      addGarment,
      removeGarment,
      rename,
      matchesFor,
    }),
    [
      ready,
      garments,
      arranged,
      context,
      mood,
      settings,
      selectMood,
      pinMood,
      setColorOnly,
      setLanguage,
      addGarment,
      removeGarment,
      rename,
      matchesFor,
    ]
  );

  return <WardrobeStore.Provider value={value}>{children}</WardrobeStore.Provider>;
}

export function useWardrobe(): WardrobeValue {
  const value = useContext(WardrobeStore);
  if (!value) throw new Error('useWardrobe deve stare dentro <WardrobeProvider>');
  return value;
}

export type { Oklch };
