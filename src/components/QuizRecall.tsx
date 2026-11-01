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
 * 默寫：看拼音與聽聲音，用手指在框裡寫出那個字，按「翻面核對」後 App 把你寫的字和標準寫法比對
 * （先對齊大小與位置，見 recallJudge），直接告訴你寫對還是寫錯，寫錯時亮起漏掉的筆；結果由 App 判定，不能自評。
 * 沒寫任何筆畫不能翻面；真的不會寫可以按「不會寫，看答案」（算寫錯）。翻面後可以「重寫」，按「下一題」才記進複習排程。
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
  // 畫布上有沒有寫任何筆畫（沒寫不能翻面核對）
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    void playKana(target.id, { slow });
    // 只在換題時自動播放
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // 比對結果：寫對才是對；沒寫完整（只點幾下）也算寫錯
  const passed = judgement?.verdict === 'right';

  const flip = () => {
    if (flipped || !hasInk) return;
    setJudgement(judgeRecall(strokesRef.current, strokesOf(target.char)?.strokes ?? []));
    setFlipped(true);
  };

  // 真的不會寫：直接看答案，算寫錯（每一筆都算漏掉）
  const giveUp = () => {
    if (flipped) return;
    const refs = strokesOf(target.char)?.strokes ?? [];
    setJudgement({ verdict: 'wrong', missing: refs.map((_, i) => i) });
    setFlipped(true);
  };

  // 翻面之後也能重寫：清掉畫布、回到還沒翻面的狀態（還沒按「下一題」之前都不記分）
  const retry = () => {
    if (rated !== null) return;
    strokesRef.current = [];
    setHasInk(false);
    setJudgement(null);
    setFlipped(false);
    setCanvasKey((k) => k + 1);
  };

  const next = () => {
    if (rated !== null || !judgement) return;
    setRated(passed);
    onAnswered(passed, { perKana: { [target.id]: passed } });
    onNext();
  };

  // DEV：直接當作寫對（翻面、判定為對），再按「下一題」
  useDevAnswer(() => {
    if (rated !== null || flipped) return;
    setJudgement({ verdict: 'right', missing: [] });
    setFlipped(true);
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
            highlight={flipped && !passed ? judgement?.missing : undefined}
            onStrokesChange={(strokes) => {
              if (flipped) return;
              strokesRef.current = strokes;
              setHasInk(strokes.length > 0);
            }}
            testID="recall-canvas"
          />
          <Text testID={flipped ? 'recall-char' : 'recall-hint'} style={[styles.hint, { color: t.muted }]}>
            {flipped ? `正確的字：${target.char}（淡色的就是標準寫法）` : '用手指在框裡寫寫看，寫完再翻面核對'}
          </Text>
          {flipped && judgement ? (
            <Text
              testID="recall-verdict"
              style={[styles.feedback, { color: passed ? t.correctText : t.wrongText }]}
            >
              {passed
                ? '寫對了！（跟標準寫法比對）'
                : '看起來寫錯了，亮起來的是漏掉的筆；跟淡色的標準寫法比比看，可以按「重寫」再試一次'}
            </Text>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.bottom}>
        {!flipped ? (
          <View style={styles.stack}>
            <View style={styles.rate}>
              <View style={styles.flex}>
                <SecondaryButton testID="recall-clear" label="重寫" onPress={retry} disabled={!hasInk} />
              </View>
              <View style={styles.flex2}>
                <PrimaryButton
                  testID="recall-flip"
                  label={hasInk ? '想好了，翻面核對' : '先在框裡寫寫看'}
                  onPress={flip}
                  disabled={!hasInk}
                />
              </View>
            </View>
            <SecondaryButton testID="recall-giveup" label="不會寫，看答案" onPress={giveUp} />
          </View>
        ) : (
          <View style={styles.stack}>
            <SecondaryButton testID="recall-retry" label="重寫" onPress={retry} />
            <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={next} />
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
  stack: { gap: 10 },
});
