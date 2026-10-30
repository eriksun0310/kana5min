import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById } from '../data';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';
import { TianGrid } from './TianGrid';

export interface QuizRecallProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 默寫自我檢查：看拼音與聽聲音，在腦中或紙上寫出那個字，按「翻面核對」看答案，再自己評「寫對了」或「沒寫出來」。
 * 這一題沒有標準答案可以判斷，對錯完全由使用者自評，所以記入複習排程的是自評結果。
 */
export function QuizRecall({ question, onAnswered, onNext, isLast }: QuizRecallProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const target = mustById(question.answerId);
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState<boolean | null>(null);

  useEffect(() => {
    void playKana(target.id, { slow });
    // 只在換題時自動播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const rate = (ok: boolean) => {
    if (rated !== null) return;
    setRated(ok);
    onAnswered(ok, { perKana: { [target.id]: ok } });
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
          <Text testID="quiz-recall" style={[styles.title, { color: t.muted }]}>
            在紙上或腦中寫出這個音的字
          </Text>
          <View style={styles.row}>
            <Text style={[styles.romaji, { color: t.text }]}>{target.romaji}</Text>
            <Pressable
              testID="recall-play"
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
          <TianGrid size={200}>
            {flipped ? (
              <KanaText size={120} lineHeightRatio={1.1} testID="recall-char">
                {target.char}
              </KanaText>
            ) : (
              <Text style={[styles.hidden, { color: t.muted }]}>？</Text>
            )}
          </TianGrid>
          {rated !== null ? (
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: rated ? t.correctText : t.wrongText }]}
            >
              {rated ? '很好！之後會隔久一點再問你' : '沒關係，等一下會再出現'}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        {rated !== null ? (
          <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
        ) : !flipped ? (
          <PrimaryButton testID="recall-flip" label="想好了，翻面核對" onPress={() => setFlipped(true)} />
        ) : (
          <View style={styles.rate}>
            <View style={styles.flex}>
              <SecondaryButton testID="recall-no" label="沒寫出來" onPress={() => rate(false)} />
            </View>
            <View style={styles.flex}>
              <PrimaryButton testID="recall-yes" label="我寫對了" onPress={() => rate(true)} />
            </View>
          </View>
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
  title: { fontSize: 15 },
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
  hidden: { fontSize: 72 },
  feedback: { fontSize: 15, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  rate: { flexDirection: 'row', gap: 10 },
});
