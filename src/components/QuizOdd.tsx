import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { confusableGroupById } from '../data/confusables';
import { mustById } from '../data';
import type { QuizQuestion } from '../logic/session';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { optionTestId, type OptionStatus } from './QuizOption';
import { QuizGridCell } from './QuizGridCell';

export interface QuizOddProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 找不同：9 格裡 8 個同一個字、1 個長得像的字，點出不一樣的那個。點一下就確定作答；
 * 答對標綠並說明差在哪裡，答錯標紅點到的格子、用綠色虛線框出正確的那一格。
 */
export function QuizOdd({ question, onAnswered, onNext, isLast }: QuizOddProps) {
  const t = useTheme();
  const cells = question.cells ?? [];
  const oddIndex = question.targetIndexes?.[0] ?? 0;
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === oddIndex;
  const odd = mustById(question.answerId);
  const tip = confusableGroupById(question.groupId)?.tip;

  const choose = (index: number) => {
    if (answered) return;
    setPicked(index);
    onAnswered(index === oddIndex);
  };

  const statusOf = (index: number): { status: OptionStatus; missed: boolean } => {
    if (!answered) return { status: 'idle', missed: false };
    if (index === picked) return { status: correct ? 'correct' : 'wrong', missed: false };
    if (index === oddIndex) return { status: 'plain', missed: true };
    return { status: 'plain', missed: false };
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
          <Text testID="quiz-odd" style={[styles.title, { color: t.muted }]}>
            找出不一樣的那一個
          </Text>
        </View>
        <View style={styles.grid}>
          {cells.map((id, index) => {
            const { status, missed } = statusOf(index);
            const isOdd = index === oddIndex;
            const testID = optionTestId({
              isCorrect: isOdd,
              index,
              wrongIndex: isOdd ? 0 : wrongIndex++,
            });
            return (
              <QuizGridCell
                key={`${question.id}-${index}`}
                char={mustById(id).char}
                status={status}
                dashed={missed}
                disabled={answered}
                testID={testID}
                onPress={() => choose(index)}
              />
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        {answered ? (
          <View style={styles.feedbackBox}>
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: correct ? t.correctText : t.wrongText }]}
            >
              {correct
                ? `找到了！不一樣的是 ${odd.char}（${odd.romaji}）`
                : `不一樣的是 ${odd.char}（${odd.romaji}），等一下會再出現`}
              {tip ? `\n${tip}` : ''}
            </Text>
            <PrimaryButton
              testID="quiz-next"
              label={isLast ? '完成，看結果' : '下一題'}
              onPress={onNext}
            />
          </View>
        ) : (
          <Text style={[styles.hint, { color: t.muted }]}>點一下就會知道對不對</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 34, paddingHorizontal: 24, alignItems: 'center' },
  title: { fontSize: 16 },
  grid: { paddingTop: 22, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  hint: { fontSize: 14, textAlign: 'center', paddingVertical: 18 },
});
