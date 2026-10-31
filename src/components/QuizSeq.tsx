import React, { useEffect, useState } from 'react';
import { useDevAnswer } from '../logic/devAnswerBus';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSequence, stopSequence } from '../audio/playSequence';
import { mustById } from '../data';
import { scoreSeq } from '../logic/groupGames';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { KANA_FONT } from './KanaText';
import { optionColors, optionTestId, type OptionStatus } from './QuizOption';

export interface QuizSeqProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

const text = (ids: readonly string[]) => ids.map((id) => mustById(id).char).join('');

/**
 * 聽音選字串：進題自動播放一串 4 個聲音，從 3 個字串裡選出對的。
 * 點選項只是暫選（可以反覆再聽），按「選這個」才確定作答。
 */
export function QuizSeq({ question, onAnswered, onNext, isLast }: QuizSeqProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const sequence = question.sequence ?? [];
  const options = question.seqOptions ?? [];
  const answerIndex = question.answerIndex ?? 0;
  const [selected, setSelected] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === answerIndex;

  useEffect(() => {
    playSequence(sequence, { slow });
    return () => stopSequence();
    // 只在換題時自動播放；設定變更不重播
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const confirm = () => {
    if (answered || selected === null) return;
    setPicked(selected);
    const r = scoreSeq(sequence, options[selected]);
    onAnswered(r.correct, { perKana: r.perKana, confusions: r.confusions });
  };

  const statusOf = (index: number): OptionStatus => {
    if (!answered) return selected === index ? 'selected' : 'idle';
    if (index === answerIndex) return 'correct';
    if (index === picked) return 'wrong';
    return 'plain';
  };

  let wrong = 0;
  // DEV：自動選好正確的字串，再按「確認」
  useDevAnswer(() => {
    if (!answered) setSelected(answerIndex);
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
          <Text testID="quiz-seq" style={[styles.title, { color: t.text }]}>
            聽，這串是哪一個？
          </Text>
          <Pressable
            testID="seq-play"
            accessibilityRole="button"
            accessibilityLabel="再聽一次"
            onPress={() => playSequence(sequence, { slow })}
            style={({ pressed }) => [
              styles.replay,
              { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Icon name="speaker" size={36} color={t.text} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            testID="seq-play-slow"
            accessibilityRole="button"
            accessibilityLabel="慢速播放"
            onPress={() => playSequence(sequence, { slow: true })}
            style={styles.slow}
          >
            <Icon name="slow" size={16} color={t.muted} />
            <Text style={{ fontSize: 14, color: t.muted }}>慢速播放</Text>
          </Pressable>
        </View>
        <View style={styles.options}>
          {options.map((seq, index) => {
            const status = statusOf(index);
            const c = optionColors(t, status);
            const isAnswer = index === answerIndex;
            const testID = optionTestId({ isCorrect: isAnswer, index, wrongIndex: isAnswer ? 0 : wrong++ });
            return (
              <Pressable
                key={`${question.id}-${index}`}
                testID={testID}
                accessibilityRole="button"
                accessibilityLabel={text(seq)}
                disabled={answered}
                onPress={() => setSelected(index)}
                style={({ pressed }) => [
                  styles.option,
                  { borderColor: c.border, backgroundColor: c.bg, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.optionText, { color: t.text }]}>{text(seq)}</Text>
              </Pressable>
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
              {correct ? `答對了！剛剛是 ${text(sequence)}` : `剛剛聽到的是 ${text(sequence)}，等一下會再出現`}
            </Text>
            <PrimaryButton
              testID="quiz-next"
              label={isLast ? '完成，看結果' : '下一題'}
              onPress={onNext}
            />
          </View>
        ) : selected === null ? (
          <PrimaryButton testID="quiz-confirm" label="點選一個字串" disabled />
        ) : (
          <PrimaryButton testID="quiz-confirm" label="選這個" onPress={confirm} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  prompt: { paddingTop: 30, paddingHorizontal: 24, alignItems: 'center', gap: 14 },
  title: { fontSize: 18, fontWeight: '700' },
  replay: {
    width: 96,
    height: 96,
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
  options: { paddingTop: 12, paddingHorizontal: 24, gap: 10 },
  option: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontFamily: KANA_FONT, fontSize: 34, letterSpacing: 8 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
