import React, { useEffect, useRef, useState } from 'react';
import { useDevAnswer } from '../logic/devAnswerBus';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playKana } from '../audio/playKana';
import { mustById } from '../data';
import { strokesOf } from '../data/strokes';
import { judgeRecall, type RecallJudgement } from '../logic/recallJudge';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import type { Stroke } from '../logic/trace';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';
import { TraceCanvas } from './TraceCanvas';

export interface QuizRecallProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 默寫：看拼音與聽聲音，用手指在框裡寫出那個字，按「翻面核對」才顯示正確的字（淡色疊在你寫的字底下）。
 * 有寫的話，App 會把你寫的字和標準寫法比對（先對齊大小與位置，見 recallJudge），直接告訴你看起來寫對還是寫錯，
 * 寫錯時亮起漏掉的筆；判斷不準可以按「改成…」，按「下一題」才把結果記進複習排程。
 * 沒寫任何筆畫（在紙上或腦中寫）就維持自評：「我寫對了」或「沒寫出來」。
 */
export function QuizRecall({ question, onAnswered, onNext, isLast }: QuizRecallProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const target = mustById(question.answerId);
  const [flipped, setFlipped] = useState(false);
  const [rated, setRated] = useState<boolean | null>(null);
  // 「重寫」換這個 key，畫布重新掛載、清掉已經寫的字
  const [canvasKey, setCanvasKey] = useState(0);
  const strokesRef = useRef<Stroke[]>([]);
  // 翻面時比對出的結果；none 代表沒寫任何筆畫，由使用者自評
  const [judgement, setJudgement] = useState<RecallJudgement | null>(null);
  // 比對結果可以被使用者改掉（判斷不準時）
  const [finalOk, setFinalOk] = useState<boolean | null>(null);

  useEffect(() => {
    void playKana(target.id, { slow });
    // 只在換題時自動播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  const flip = () => {
    if (flipped) return;
    const j = judgeRecall(strokesRef.current, strokesOf(target.char)?.strokes ?? []);
    setJudgement(j);
    setFinalOk(j.verdict === 'none' ? null : j.verdict === 'right');
    setFlipped(true);
  };

  const rate = (ok: boolean) => {
    if (rated !== null) return;
    setRated(ok);
    onAnswered(ok, { perKana: { [target.id]: ok } });
  };

  // DEV：自動翻面，顯示正確的字，再自己評「寫對了」
  useDevAnswer(() => {
    if (rated === null) flip();
  });

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        scrollEnabled={false}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.prompt}>
          <Text testID="quiz-recall" style={[styles.title, { color: t.muted }]}>
            寫出這個音的字
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
          <TraceCanvas
            // 換題就重新掛載，清掉上一題寫的字
            key={`${question.id}-${canvasKey}`}
            char={target.char}
            size={280}
            guide={flipped}
            highlight={flipped && judgement?.verdict === 'wrong' ? judgement.missing : undefined}
            onStrokesChange={(strokes) => {
              if (!flipped) strokesRef.current = strokes;
            }}
            testID="recall-canvas"
          />
          <Text testID={flipped ? 'recall-char' : 'recall-hint'} style={[styles.hint, { color: t.muted }]}>
            {flipped ? `正確的字：${target.char}（淡色的就是標準寫法）` : '用手指在框裡寫寫看，寫完再翻面核對'}
          </Text>
          {flipped && judgement && judgement.verdict !== 'none' ? (
            <Text
              testID="recall-verdict"
              style={[styles.feedback, { color: finalOk ? t.correctText : t.wrongText }]}
            >
              {finalOk
                ? judgement.verdict === 'right'
                  ? '看起來寫對了（跟標準寫法比對）'
                  : '已改成寫對了'
                : judgement.verdict === 'wrong'
                  ? '看起來寫錯了，亮起來的是漏掉的筆；跟淡色的標準寫法比比看'
                  : '已改成沒寫對'}
            </Text>
          ) : null}
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
          <View style={styles.rate}>
            <View style={styles.flex}>
              <SecondaryButton
                testID="recall-clear"
                label="重寫"
                onPress={() => {
                  strokesRef.current = [];
                  setCanvasKey((k) => k + 1);
                }}
              />
            </View>
            <View style={styles.flex2}>
              <PrimaryButton testID="recall-flip" label="想好了，翻面核對" onPress={flip} />
            </View>
          </View>
        ) : judgement && judgement.verdict !== 'none' && finalOk !== null ? (
          // 有寫字：App 已經比對過，這裡確認結果（判斷不準可以改）再下一題
          <View style={styles.rate}>
            <View style={styles.flex}>
              <SecondaryButton
                testID="recall-override"
                label={finalOk ? '其實沒寫對' : '我寫對了'}
                onPress={() => setFinalOk(!finalOk)}
              />
            </View>
            <View style={styles.flex}>
              <PrimaryButton
                testID="quiz-next"
                label={isLast ? '完成，看結果' : '下一題'}
                onPress={() => {
                  rate(finalOk);
                  onNext();
                }}
              />
            </View>
          </View>
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
  flex2: { flex: 2 },
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
  hint: { fontSize: 13, textAlign: 'center' },
  feedback: { fontSize: 15, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  rate: { flexDirection: 'row', gap: 10 },
});
