import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { applyDebugPreset } from './applyPreset';
import { isDebugPreset } from './presets';

/** kana5min://debug?preset=... 的處理：套用預設後回首頁。只由 app/debug.tsx 在 __DEV__ 下載入。 */
export default function DebugPreset() {
  const router = useRouter();
  const { preset } = useLocalSearchParams<{ preset?: string }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isDebugPreset(preset)) await applyDebugPreset(preset);
      if (!cancelled) router.replace('/');
    })().catch(() => {
      if (!cancelled) router.replace('/');
    });
    return () => {
      cancelled = true;
    };
  }, [preset, router]);

  return <View />;
}
