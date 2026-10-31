import React, { useEffect, useState } from 'react';
import { useDevAnswer } from '../logic/devAnswerBus';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById } from '../data';
import { allMistakes, scoreFindAll } from '../logic/groupGames';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';
import { QuizGridCell } from './QuizGridCell';
import type { OptionStatus } from './QuizOption';

/** 開發版本：目標格 all-target-N、其他格 all-wrong-N（Maestro 用）；正式版本一律 all-cell-N，不透露答案。 */
function cellTestId(index: number, isTarget: boolean): string {
  if (__DEV__) return isTarget ? `all-target-${index}` : `all-wrong-${index}`;
  return `all-cell-${index}`;
}

export interface QuizFindAllProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 找出所有：題目只給拼音和聲音（不顯示字形、不說有幾個），從格子裡勾出所有符合的字，按「確認」才計分。
 * 確認後才揭曉：選對的標綠、選錯的標紅、漏掉的用綠色虛線框出，並顯示答案字形。
 */
export function QuizFindAll({ question, onAnswered, onNext, isLast }: QuizFindAllProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const cells = question.cells ?? [];
  const targets = question.targetIndexes ?? [];
  const target = mustById(question.answerId);
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const columns = cells.length > 8 ? 4 : 3;

  useEffect(() => {
    void playKana(target.id, { slow });
    // 只在換題時自動播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const toggle = (index: number) => {
    if (confirmed) return;
    setSelected((s) => (s.includes(index) ? s.filter((i) => i !== index) : [...s, index]));
  };

  const confirm = () => {
    if (confirmed || selected.length === 0) return;
    setConfirmed(true);
    const r = scoreFindAll(cells, selected, targets, target.id);
    onAnswered(r.correct, { perKana: { [target.id]: r.correct }, confusions: r.confusions });
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
    ? `全部找到了！${target.char} 讀作 ${target.romaji}`
    : `${target.char} 讀作 ${target.romaji}。漏掉 ${missed} 個、多選 ${extra} 個，等一下會再出現`;

  // DEV：自動勾好所有目標格，再按「確認」
  useDevAnswer(() => {
    if (!confirmed) setSelected([...targets]);
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
          <Text testID="quiz-all" style={[styles.title, { color: t.muted }]}>
            找出所有讀作
          </Text>
          <View style={styles.row}>
            <Text style={[styles.romaji, { color: t.text }]}>{target.romaji}</Text>
            <Pressable
              testID="all-play"
              accessibilityRole="button"
              accessibilityLabel="再聽一次"
              onPress={() => void playKana(target.id, { slow })}
              style={({ pressed }) => [
                styles.play,
                { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="speaker" size={22} color={t.text} />
            </Pressable>
          </View>
          <Text style={[styles.sub, { color: t.muted }]}>可以點多個，點兩下取消</Text>
        </View>
        <View style={styles.grid}>
          {cells.map((id, index) => {
            const { status, missed: miss } = cellState(index);
            return (
              <QuizGridCell
                key={`${question.id}-${index}`}
                columns={columns}
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
            <KanaText size={32} lineHeightRatio={1.1} style={styles.center}>
              {target.char}
            </KanaText>
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: correct ? t.correctText : t.wrongText }]}
            >
              {feedback}
            </Text>
            <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
          </View>
        ) : (
          <PrimaryButton
            testID="quiz-confirm"
            label={selected.length === 0 ? '選出所有符合的字' : `確認（已選 ${selected.length} 個）`}
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
  prompt: { paddingTop: 26, paddingHorizontal: 24, alignItems: 'center', gap: 4 },
  title: { fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  romaji: { fontSize: 52, fontWeight: '700', letterSpacing: 1 },
  play: {
    width: 48,
    height: 48,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: { fontSize: 13 },
  grid: { paddingTop: 18, paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dev: { alignSelf: 'center', padding: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 8 },
  center: { textAlign: 'center' },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
