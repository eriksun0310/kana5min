import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { timeConfig } from '../logic/practiceTimer';
import { useSessionStore } from '../store/sessionStore';
import { applyDebugPreset } from './applyPreset';
import { isDebugPreset } from './presets';

/** kana5min://debug?preset=...[&due=1][&timescale=0.001] 的處理：套用預設後回首頁。
 * due=1 讓全部進度到期；timescale 縮短練習時間（每日目標與「再練 5 分鐘」都乘上它）；兩者都會丟掉存檔。只由 app/debug.tsx 在 __DEV__ 下載入。 */
export default function DebugPreset() {
  const router = useRouter();
  const { preset, due, timescale } = useLocalSearchParams<{
    preset?: string;
    due?: string;
    timescale?: string;
  }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const scale = Number(timescale);
      timeConfig.scale = scale > 0 ? scale : 1;
      // 套用預設會換掉進度，舊的接續存檔跟著丟掉
      useSessionStore.getState().discardSaved();
      useSessionStore.getState().clear();
      if (isDebugPreset(preset)) await applyDebugPreset(preset, Date.now(), { due: due === '1' });
      if (!cancelled) router.replace('/');
    })().catch(() => {
      if (!cancelled) router.replace('/');
    });
    return () => {
      cancelled = true;
    };
  }, [preset, due, timescale, router]);

  return <View />;
}
