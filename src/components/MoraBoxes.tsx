import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Mora, MoraType } from '../data/specialSounds';
import { useTheme } from '../theme/useTheme';
import type { ThemeTokens } from '../theme/tokens';
import { KANA_FONT } from './KanaText';

export interface MoraBoxesProps {
  moras: Mora[];
  /** true 時所有格子都畫成一般樣式（練習題作答前不透露哪一格是特殊拍） */
  plain?: boolean;
}

function boxColors(t: ThemeTokens, type: MoraType) {
  switch (type) {
    case 'long':
    case 'youon':
      // 長音延長拍、拗音小字：accentSoft 底 + accent 2px 實框
      return { bg: t.accentSoft, border: t.accent, borderStyle: 'solid' as const, text: t.text };
    case 'sokuon':
      // 促音停頓拍：透明底 + accent 2px 虛框，字用 accentText
      return { bg: 'transparent', border: t.accent, borderStyle: 'dashed' as const, text: t.accentText };
    default:
      return { bg: t.chip, border: 'transparent', borderStyle: 'solid' as const, text: t.text };
  }
}

/** 拍數方塊（C2-15～17）：每格一拍，46×52、radius 12、Klee One 24。 */
export function MoraBoxes({ moras, plain = false }: MoraBoxesProps) {
  const t = useTheme();
  return (
    <View style={styles.row}>
      {moras.map((m, i) => {
        const c = boxColors(t, plain ? 'normal' : m.type);
        return (
          <View
            key={`${i}-${m.char}`}
            style={[
              styles.box,
              { backgroundColor: c.bg, borderColor: c.border, borderStyle: c.borderStyle },
            ]}
          >
            <Text style={[styles.char, { color: c.text }]}>{m.char}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  // 五拍的詞加上播放鈕會比卡片寬 4px，允許方塊略為縮窄（設計檔的 flex 預設也會縮）
  box: {
    width: 46,
    height: 52,
    flexShrink: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: { fontFamily: KANA_FONT, fontSize: 24, lineHeight: 30 },
});
