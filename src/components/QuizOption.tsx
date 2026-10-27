import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import type { ThemeTokens } from '../theme/tokens';
import { Icon } from './Icon';
import { KANA_FONT } from './KanaText';

/**
 * 選項狀態：
 * - idle：還沒操作
 * - selected：看字選音專用，已聽過並暫選（再點一次或按「選這個」才確定）
 * - correct／wrong：作答後的正確答案（綠）／選錯的選項（紅）
 * - plain：作答後的其他選項
 */
export type OptionStatus = 'idle' | 'selected' | 'correct' | 'wrong' | 'plain';

export function optionColors(t: ThemeTokens, status: OptionStatus): { border: string; bg: string; tag: string } {
  switch (status) {
    case 'selected':
      return { border: t.accent, bg: t.accentSoft, tag: t.accentText };
    case 'correct':
      return { border: t.correct, bg: t.correctSoft, tag: t.correctText };
    case 'wrong':
      return { border: t.wrong, bg: t.wrongSoft, tag: t.wrongText };
    default:
      return { border: t.line, bg: t.surface, tag: t.muted };
  }
}

/**
 * 選項 testID（docs/architecture.md 第 8 節）：
 * 開發版本正確選項為 opt-correct、錯誤選項為 opt-wrong-0..2；正式版本一律 opt-0..3，不透露答案。
 */
export function optionTestId(args: { isCorrect: boolean; index: number; wrongIndex: number }): string {
  if (__DEV__) return args.isCorrect ? 'opt-correct' : `opt-wrong-${args.wrongIndex}`;
  return `opt-${args.index}`;
}

/** 每個選項的 testID（依選項順序）。 */
export function optionTestIds(options: string[], answerId: string): string[] {
  let wrong = 0;
  return options.map((id, index) =>
    optionTestId({ isCorrect: id === answerId, index, wrongIndex: id === answerId ? 0 : wrong++ }),
  );
}

export interface QuizSoundOptionProps {
  /** 聲音編號（1–4） */
  n: number;
  status: OptionStatus;
  /** 右側小字，例如「已聽」「ke・正確」「ka」 */
  tag?: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/** 看字選音的選項列（C2-08）：36px 喇叭圓、「聲音 N」、右側標記。minHeight 62、radius 18、border 2。 */
export function QuizSoundOption({ n, status, tag, onPress, disabled, testID }: QuizSoundOptionProps) {
  const t = useTheme();
  const c = optionColors(t, status);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`聲音 ${n}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.speaker, { backgroundColor: t.chip }]}>
        <Icon name="speakerSmall" size={18} color={t.text} />
      </View>
      <Text style={[styles.label, { color: t.text }]}>聲音 {n}</Text>
      {tag ? <Text style={[styles.tag, { color: c.tag }]}>{tag}</Text> : null}
    </Pressable>
  );
}

export interface QuizKanaCardProps {
  char: string;
  status: OptionStatus;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/** 聽音選字的字卡（C2-09）：高 116、radius 22、border 2、Klee One 60。 */
export function QuizKanaCard({ char, status, onPress, disabled, testID }: QuizKanaCardProps) {
  const t = useTheme();
  const c = optionColors(t, status);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={char}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={[styles.cardChar, { color: t.text }]}>{char}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
  },
  speaker: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, textAlign: 'left', fontSize: 16 },
  tag: { fontSize: 14 },
  card: {
    flex: 1,
    height: 116,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardChar: { fontFamily: KANA_FONT, fontSize: 60, lineHeight: 72 },
});
