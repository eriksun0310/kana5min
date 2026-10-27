import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById } from '../data';
import { shouldShowRomaji } from '../logic/romaji';
import type { QuizQuestion } from '../logic/session';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { KanaText } from './KanaText';
import { optionTestIds, QuizSoundOption, type OptionStatus } from './QuizOption';

export interface QuizSeeProps {
  question: QuizQuestion;
  /** 確定作答時呼叫一次 */
  onAnswered: (correct: boolean) => void;
  /** 按「下一題」／「完成，看結果」 */
  onNext: () => void;
  isLast: boolean;
}

/**
 * 看字選音（C2-08）。
 * 互動：第一次點某個選項＝播放該聲音並暫選（標「已聽」，邊框改主色）；
 * 再點同一個選項，或按底部「選這個」，才確定作答。確定後顯示答案與各選項的羅馬拼音。
 */
export function QuizSee({ question, onAnswered, onNext, isLast }: QuizSeeProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const autoHide = useSettingsStore((s) => s.romajiAutoHide);
  const progress = useProgressStore((s) => s.progress);
  const target = mustById(question.answerId);

  const [heard, setHeard] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;

  const show = (id: string) => shouldShowRomaji(progress[id], { romajiAutoHide: autoHide });
  const ids = optionTestIds(question.options, question.answerId);

  const confirm = (index: number) => {
    if (answered) return;
    setPicked(index);
    onAnswered(question.options[index] === question.answerId);
  };

  const press = (index: number) => {
    if (answered) return;
    if (selected === index) {
      confirm(index);
      return;
    }
    playKana(question.options[index], { slow });
    setSelected(index);
    setHeard((h) => (h.includes(index) ? h : [...h, index]));
  };

  const optionView = (id: string, index: number) => {
    let status: OptionStatus = 'idle';
    let tag = '';
    if (answered) {
      const isAnswer = id === question.answerId;
      const isWrongPick = index === picked && !isAnswer;
      const k = mustById(id);
      if (isAnswer) {
        status = 'correct';
        tag = show(id) ? `${k.romaji}・正確` : '正確';
      } else if (isWrongPick) {
        status = 'wrong';
        tag = k.romaji; // 選錯時一律顯示，幫助對照
      } else {
        status = 'plain';
        tag = show(id) ? k.romaji : '';
      }
    } else if (selected === index) {
      status = 'selected';
      tag = '已聽';
    } else if (heard.includes(index)) {
      tag = '已聽';
    }
    return (
      <QuizSoundOption
        key={`${question.id}-${index}`}
        n={index + 1}
        status={status}
        tag={tag}
        disabled={answered}
        testID={ids[index]}
        onPress={() => press(index)}
      />
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text style={[styles.promptText, { color: t.muted }]}>這個字怎麼念？</Text>
          <KanaText size={170} lineHeightRatio={1.1} testID="quiz-kana">
            {target.char}
          </KanaText>
        </View>
        <View style={styles.options}>{question.options.map(optionView)}</View>
      </ScrollView>
      <View style={styles.bottom}>
        {answered ? (
          <PrimaryButton
            testID="quiz-next"
            label={isLast ? '完成，看結果' : '下一題'}
            onPress={onNext}
          />
        ) : selected === null ? (
          <PrimaryButton testID="quiz-confirm" label="點聲音聽聽看，再選一個" disabled />
        ) : (
          <PrimaryButton testID="quiz-confirm" label="選這個" onPress={() => confirm(selected)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 34, paddingHorizontal: 24, alignItems: 'center', gap: 6 },
  promptText: { fontSize: 15 },
  options: { paddingTop: 20, paddingHorizontal: 24, gap: 10 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
});
