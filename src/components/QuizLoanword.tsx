import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { wordById } from '../data';
import { loanwordFeedback } from '../logic/loanword';
import type { QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';
import { optionColors, optionTestId, type OptionStatus } from './QuizOption';

export interface QuizLoanwordProps {
  question: QuizQuestion;
  /** 點選項即作答，呼叫一次 */
  onAnswered: (correct: boolean) => void;
  /** 按「下一題」／「完成，看結果」 */
  onNext: () => void;
  isLast: boolean;
}

/**
 * 讀外來語（C2-20）：看片假名詞，從 4 個中文意思選一個。
 * 點選項即作答（不需要二次確認）；作答前底部是停用的「選一個答案」。
 */
export function QuizLoanword({ question, onAnswered, onNext, isLast }: QuizLoanwordProps) {
  const t = useTheme();
  const defaultSlow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const word = question.wordId ? wordById(question.wordId) : undefined;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  if (!word) return null;

  const correctIndex = question.options.indexOf(question.answerId);
  const correct = picked !== null && picked === correctIndex;

  const choose = (index: number) => {
    if (answered) return;
    setPicked(index);
    onAnswered(index === correctIndex);
  };

  const statusOf = (index: number): OptionStatus => {
    if (!answered) return 'idle';
    if (index === correctIndex) return 'correct';
    if (index === picked) return 'wrong';
    return 'plain';
  };

  let wrongIndex = 0;
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text style={[styles.promptText, { color: t.muted }]}>讀讀看，這是什麼？</Text>
          <KanaText size={72} lineHeightRatio={1.2} style={styles.word} testID="loanword-text">
            {word.text}
          </KanaText>
          <Pressable
            testID="play-word"
            accessibilityRole="button"
            accessibilityLabel="播放發音"
            onPress={() => playKana(word.id, { slow: defaultSlow })}
            style={({ pressed }) => [
              styles.play,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={21} color={t.text} />
          </Pressable>
        </View>

        <View style={styles.options}>
          {question.options.map((label, index) => {
            const c = optionColors(t, statusOf(index));
            const isCorrect = index === correctIndex;
            const id = optionTestId({ isCorrect, index, wrongIndex: isCorrect ? 0 : wrongIndex++ });
            return (
              <Pressable
                key={`${question.id}-${index}`}
                testID={id}
                accessibilityRole="button"
                accessibilityLabel={label}
                disabled={answered}
                onPress={() => choose(index)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.optionLabel, { color: t.text }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {answered ? (
          <Text
            testID="quiz-feedback"
            style={[styles.feedback, { color: correct ? t.correctText : t.wrongText }]}
          >
            {loanwordFeedback(word, correct)}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.bottom}>
        {answered ? (
          <PrimaryButton
            testID="quiz-next"
            label={isLast ? '完成，看結果' : '下一題'}
            onPress={onNext}
          />
        ) : (
          <PrimaryButton testID="quiz-confirm" label="選一個答案" disabled />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 36, paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  promptText: { fontSize: 15 },
  word: { letterSpacing: 4, textAlign: 'center' },
  play: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  options: { paddingTop: 24, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: {
    width: '48.5%',
    flexGrow: 1,
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  optionLabel: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  feedback: { paddingTop: 16, paddingHorizontal: 24, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
});
