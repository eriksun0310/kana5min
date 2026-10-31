import React, { useEffect, useState } from 'react';
import { useDevAnswer } from '../logic/devAnswerBus';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { wordById } from '../data';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { wordReadFeedback } from '../logic/wordRead';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { KanaText } from './KanaText';
import { optionColors, optionTestId, type OptionStatus } from './QuizOption';

export interface QuizWordReadProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 看詞選拼音：看片假名詞，從 4 個拼音選一個；點選項即作答。
 * 作答前不顯示意思、也不能播放（會洩漏答案）；作答後揭曉意思並自動播放。
 */
export function QuizWordRead({ question, onAnswered, onNext, isLast }: QuizWordReadProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const word = question.wordId ? wordById(question.wordId) : undefined;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correctIndex = question.options.indexOf(question.answerId);
  const correct = picked !== null && picked === correctIndex;

  useEffect(() => {
    if (answered && word) void playKana(word.id, { slow });
    // 只在作答後播放一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  if (!word) return null;

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
  useDevAnswer(() => {
    if (!answered) choose(correctIndex);
  });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text testID="quiz-wordread" style={[styles.promptText, { color: t.muted }]}>
            讀讀看，怎麼唸？
          </Text>
          <KanaText size={64} lineHeightRatio={1.2} style={styles.word} testID="wordread-text">
            {word.text}
          </KanaText>
          {answered ? (
            <Text testID="wordread-meaning" style={[styles.meaning, { color: t.text }]}>
              {word.meaning}
            </Text>
          ) : (
            <Text style={[styles.promptText, { color: t.muted }]}>答完才會告訴你意思</Text>
          )}
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
            {wordReadFeedback(word, correct)}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.bottom}>
        {answered ? (
          <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
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
  prompt: { paddingTop: 36, paddingHorizontal: 24, alignItems: 'center', gap: 10 },
  promptText: { fontSize: 15 },
  word: { letterSpacing: 4, textAlign: 'center' },
  meaning: { fontSize: 20, fontWeight: '700' },
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
  optionLabel: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  feedback: { paddingTop: 16, paddingHorizontal: 24, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
});
