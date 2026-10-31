import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SecondaryButton } from '../components';
import { useProgressStore } from '../store';
import { useTheme } from '../theme/useTheme';
import { applyDebugPreset } from './applyPreset';
import type { DebugPresetName } from './presets';

const ACTIONS: { preset: DebugPresetName; label: string }[] = [
  { preset: 'hiragana-started', label: '剛開始：只學了 あ～こ（還不能玩時測鎖定）' },
  { preset: 'hiragana-almost', label: '平假名差 ん：只玩平假名 2 關' },
  { preset: 'katakana-started', label: '平假名學完＋片假名開始：6 關都能玩' },
  { preset: 'reset', label: '重設進度（什麼都沒學）' },
];

/**
 * 掉字歸類選字畫面上方的開發用按鈕：一鍵把進度設成預設狀態（不離開這個畫面），方便測各個階段。
 * 只在 __DEV__ 由畫面用 require 載入，正式包不會包含（src/dev 只能在開發版引用）。
 */
export default function DropDevBar() {
  const t = useTheme();
  const learnedCount = useProgressStore((s) => Object.values(s.progress).filter((p) => p.learnedAt != null).length);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const apply = async (preset: DebugPresetName) => {
    if (busy) return;
    setBusy(true);
    try {
      await applyDebugPreset(preset);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View testID="drop-dev-bar" style={[styles.box, { borderColor: t.accent }]}>
      <Pressable
        testID="dev-bar-toggle"
        accessibilityRole="button"
        onPress={() => setOpen((v) => !v)}
        style={styles.head}
      >
        <Text style={{ color: t.accentText, fontSize: 13, fontWeight: '700' }}>
          DEV　套用進度（目前已學 {learnedCount} 個字）
        </Text>
        <Text style={{ color: t.accentText, fontSize: 13 }}>{open ? '收起' : '展開'}</Text>
      </Pressable>
      {open && ACTIONS.map((a) => (
        <SecondaryButton
          key={a.preset}
          testID={`dev-preset-${a.preset}`}
          label={a.label}
          disabled={busy}
          onPress={() => apply(a.preset)}
          style={styles.btn}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 10, gap: 8, marginTop: 12 },
  head: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btn: { minHeight: 44 },
});
