import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from '../components';
import { useTheme } from '../theme/useTheme';
import { applyDebugPreset } from './applyPreset';
import type { DebugPresetName } from './presets';

const ACTIONS: { preset: DebugPresetName; label: string; testID: string }[] = [
  { preset: 'hiragana-done', label: '平假名全部完成', testID: 'debug-hiragana-done' },
  { preset: 'all-done', label: '全部完成', testID: 'debug-all-done' },
  { preset: 'reset', label: '重設進度', testID: 'debug-reset' },
];

/**
 * 設定頁最下方的開發者選單：一鍵把進度設成預設狀態，套用後回首頁。
 * 只在 __DEV__ 由設定頁用 require 載入，正式包不會包含這個檔案
 * （驗收：Release 的 main.jsbundle 不得出現「開發者選單」或 debug-all-done）。
 */
export default function DebugMenu() {
  const t = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const apply = async (preset: DebugPresetName) => {
    if (busy) return;
    setBusy(true);
    try {
      await applyDebugPreset(preset);
      // 設定頁是分頁之一，切回「今天」分頁讓首頁重新取得焦點（會接著顯示對應的過場畫面）
      router.navigate('/');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section} testID="debug-menu">
      <Text style={{ fontSize: 13, color: t.muted, paddingLeft: 4 }}>開發者選單</Text>
      <View style={styles.buttons}>
        {ACTIONS.map((a) => (
          <SecondaryButton
            key={a.preset}
            testID={a.testID}
            label={a.label}
            disabled={busy}
            onPress={() => apply(a.preset)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  buttons: { gap: 10 },
});
