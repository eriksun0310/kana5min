import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById } from '../data';
import { shouldShowRomaji } from '../logic/romaji';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useProgressStore } from '../store/progressStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { optionTestIds, QuizKanaCard, type OptionStatus } from './QuizOption';

export interface QuizHearProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/** 選項分成每列幾個：2 個一列兩欄、3 個一列三欄、其餘（4 個）兩列兩欄。 */
export function optionColumns(count: number): number {
  return count === 3 ? 3 : 2;
}

/**
 * 聽音選字（C2-09）：進題自動播放；點字卡就確定作答。
 * 易混淆字題（type = confuse）沿用同一版面，選項只有該組成員（2～3 個），字卡大小不變。
 */
export function QuizHear({ question, onAnswered, onNext, isLast }: QuizHearProps) {
  const t = useTheme();
  const defaultSlow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const autoHide = useSettingsStore((s) => s.romajiAutoHide);
  const progress = useProgressStore((s) => s.progress);
  const target = mustById(question.answerId);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ids = optionTestIds(question.options, question.answerId);

  // 進題自動播放一次（預設速度依設定）
  useEffect(() => {
    playKana(question.answerId, { slow: defaultSlow });
    // 只在換題時播放；設定變更不重播
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const correct = picked !== null && question.options[picked] === question.answerId;
  const showTargetRomaji = shouldShowRomaji(progress[target.id], { romajiAutoHide: autoHide });
  let feedback = '';
  let feedbackColor = t.correctText;
  if (answered) {
    if (correct) {
      feedback = showTargetRomaji ? `答對了！${target.char} 讀作 ${target.romaji}` : '答對了！';
    } else {
      // 答錯時一律顯示羅馬拼音，幫助記住
      feedback = `剛剛的聲音是 ${target.char}（${target.romaji}），等一下會再出現`;
      feedbackColor = t.wrongText;
    }
  }

  const choose = (index: number) => {
    if (answered) return;
    setPicked(index);
    onAnswered(question.options[index] === question.answerId, { picked: question.options[index] });
  };

  const statusOf = (id: string, index: number): OptionStatus => {
    if (!answered) return 'idle';
    if (id === question.answerId) return 'correct';
    if (index === picked) return 'wrong';
    return 'plain';
  };

  const cols = optionColumns(question.options.length);
  const rows: string[][] = [];
  for (let i = 0; i < question.options.length; i += cols) rows.push(question.options.slice(i, i + cols));
  const title = question.type === 'confuse' ? '這幾個字很像，聽聲音選出正確的字' : '聽聲音，選出正確的字';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          <Pressable
            testID="replay-audio"
            accessibilityRole="button"
            accessibilityLabel="再聽一次"
            onPress={() => playKana(question.answerId, { slow: defaultSlow })}
            style={({ pressed }) => [
              styles.replay,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={52} color={t.text} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            testID="play-slow"
            accessibilityRole="button"
            accessibilityLabel="慢速播放"
            onPress={() => playKana(question.answerId, { slow: true })}
            style={styles.slow}
          >
            <Icon name="slow" size={16} color={t.muted} />
            <Text style={[styles.slowLabel, { color: t.muted }]}>慢速播放</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {rows.map((row, r) => (
            <View key={r} style={styles.gridRow}>
              {row.map((id, c) => {
                const index = r * cols + c;
                return (
                  <QuizKanaCard
                    key={`${question.id}-${index}`}
                    char={mustById(id).char}
                    status={statusOf(id, index)}
                    disabled={answered}
                    testID={ids[index]}
                    onPress={() => choose(index)}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        {answered ? (
          <View style={styles.feedbackBox}>
            <Text testID="quiz-feedback" style={[styles.feedback, { color: feedbackColor }]}>
              {feedback}
            </Text>
            <PrimaryButton
              testID="quiz-next"
              label={isLast ? '完成，看結果' : '下一題'}
              onPress={onNext}
            />
          </View>
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
  prompt: { paddingTop: 34, paddingHorizontal: 24, alignItems: 'center', gap: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  replay: {
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slow: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slowLabel: { fontSize: 14 },
  grid: { paddingTop: 16, paddingHorizontal: 24, gap: 12 },
  gridRow: { flexDirection: 'row', gap: 12 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center' },
});
