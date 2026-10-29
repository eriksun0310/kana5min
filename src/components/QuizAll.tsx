import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { mustById } from '../data';
import { allMistakes, isAllCorrect } from '../logic/groupGames';
import type { QuizQuestion } from '../logic/session';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { KanaText } from './KanaText';
import { QuizGridCell } from './QuizGridCell';
import type { OptionStatus } from './QuizOption';

/** 開發版本：目標格 all-target-N、其他格 all-wrong-N（Maestro 用）；正式版本一律 all-cell-N，不透露答案。 */
function cellTestId(index: number, isTarget: boolean): string {
  if (__DEV__) return isTarget ? `all-target-${index}` : `all-wrong-${index}`;
  return `all-cell-${index}`;
}

export interface QuizAllProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 找出所有：12 格裡找出所有指定的字，可以點多個（再點取消），按「確認」才計分。
 * 確認後：選對的標綠、選錯的標紅、漏掉的用綠色虛線框出。
 */
export function QuizAll({ question, onAnswered, onNext, isLast }: QuizAllProps) {
  const t = useTheme();
  const cells = question.cells ?? [];
  const targets = question.targetIndexes ?? [];
  const target = mustById(question.answerId);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const toggle = (index: number) => {
    if (confirmed) return;
    setSelected((s) => (s.includes(index) ? s.filter((i) => i !== index) : [...s, index]));
  };

  const confirm = () => {
    if (confirmed || selected.length === 0) return;
    setConfirmed(true);
    onAnswered(isAllCorrect(selected, targets));
  };

  const cellState = (index: number): { status: OptionStatus; missed: boolean } => {
    const isTarget = targets.includes(index);
    const isSel = selected.includes(index);
    if (!confirmed) return { status: isSel ? 'selected' : 'idle', missed: false };
    if (isSel) return { status: isTarget ? 'correct' : 'wrong', missed: false };
    return { status: 'plain', missed: isTarget };
  };

  const { missed, extra } = allMistakes(selected, targets);
  const correct = confirmed && missed === 0 && extra === 0;
  const feedback = correct
    ? `全部找到了！一共 ${targets.length} 個 ${target.char}`
    : `漏掉 ${missed} 個、多選 ${extra} 個，等一下會再出現`;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text testID="quiz-all" style={[styles.title, { color: t.muted }]}>
            找出所有的
          </Text>
          <KanaText size={56} lineHeightRatio={1.15}>
            {target.char}
          </KanaText>
          <Text style={[styles.sub, { color: t.muted }]}>有 {targets.length} 個，可以點多個</Text>
        </View>
        <View style={styles.grid}>
          {cells.map((id, index) => {
            const { status, missed: miss } = cellState(index);
            return (
              <QuizGridCell
                key={`${question.id}-${index}`}
                columns={4}
                char={mustById(id).char}
                status={status}
                dashed={miss}
                disabled={confirmed}
                testID={cellTestId(index, targets.includes(index))}
                onPress={() => toggle(index)}
              />
            );
          })}
        </View>
        {__DEV__ && !confirmed ? (
          // 開發版本專用：一鍵選好所有目標格，讓 Maestro 不用逐格點
          <Pressable testID="dev-solve" onPress={() => setSelected([...targets])} style={styles.dev}>
            <Text style={{ fontSize: 10, color: t.muted }}>dev</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={styles.bottom}>
        {confirmed ? (
          <View style={styles.feedbackBox}>
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: correct ? t.correctText : t.wrongText }]}
            >
              {feedback}
            </Text>
            <PrimaryButton
              testID="quiz-next"
              label={isLast ? '完成，看結果' : '下一題'}
              onPress={onNext}
            />
          </View>
        ) : (
          <PrimaryButton
            testID="quiz-confirm"
            label={selected.length === 0 ? '選出所有的字' : `確認（已選 ${selected.length} 個）`}
            disabled={selected.length === 0}
            onPress={confirm}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 26, paddingHorizontal: 24, alignItems: 'center', gap: 2 },
  title: { fontSize: 16 },
  sub: { fontSize: 13 },
  grid: { paddingTop: 18, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dev: { alignSelf: 'center', padding: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
