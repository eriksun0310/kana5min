import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { playSequence, stopSequence } from '../audio/playSequence';
import { byId, mustById, seionGrid } from '../data';
import { scoreReadSeq } from '../logic/groupGames';
import type { AnswerDetail, QuizQuestion } from '../logic/session';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton } from './Buttons';
import { Icon } from './Icon';
import { KanaText } from './KanaText';
import { optionColors } from './QuizOption';

export interface QuizReadSeqProps {
  question: QuizQuestion;
  onAnswered: (correct: boolean, detail?: AnswerDetail) => void;
  onNext: () => void;
  isLast: boolean;
}

/**
 * 念出一串：給一串假名，從固定的拼音鍵盤依序輸入拼音。
 * 鍵盤依五十音表排版、位置不變，只放已學的字（還沒學的位置留空，整列都空的列不顯示），
 * 所以鍵盤的內容和這一題的答案無關。作答前不播放聲音（會洩漏答案）。
 */
export function QuizReadSeq({ question, onAnswered, onNext, isLast }: QuizReadSeqProps) {
  const t = useTheme();
  const slow = useSettingsStore((s) => s.audioSpeed) === 'slow';
  const sequence = question.sequence ?? [];
  const keyIds = question.keyIds ?? [];
  const script = mustById(sequence[0]).script;
  const [typed, setTyped] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => () => stopSequence(), []);

  // 5 欄的鍵盤列；整列都沒有鍵就略過
  const rows = useMemo(() => {
    const grid = seionGrid(script);
    const have = new Set(keyIds);
    const out: (string | null)[][] = [];
    for (let r = 0; r * 5 < grid.length; r++) {
      const row = grid.slice(r * 5, r * 5 + 5).map((id) => (id && have.has(id) ? id : null));
      if (row.some((id) => id !== null)) out.push(row);
    }
    return out;
  }, [keyIds, script]);

  const full = typed.length >= sequence.length;
  const press = (id: string) => {
    if (confirmed || full) return;
    setTyped((s) => [...s, id]);
  };
  const result = confirmed ? scoreReadSeq(sequence, typed) : null;

  const confirm = () => {
    if (confirmed || !full) return;
    setConfirmed(true);
    const r = scoreReadSeq(sequence, typed);
    onAnswered(r.correct, { perKana: r.perKana, confusions: r.confusions });
    playSequence(sequence, { slow });
  };

  const slotColors = (i: number) => {
    if (!confirmed) return optionColors(t, typed[i] ? 'selected' : 'idle');
    const ok = byId(typed[i] ?? '')?.romaji === byId(sequence[i])?.romaji;
    return optionColors(t, ok ? 'correct' : 'wrong');
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
          <Text testID="quiz-readseq" style={[styles.title, { color: t.muted }]}>
            念念看，這串怎麼唸？
          </Text>
          <KanaText size={52} lineHeightRatio={1.2} style={styles.word} testID="readseq-text">
            {sequence.map((id) => mustById(id).char).join('')}
          </KanaText>
          <View style={styles.slots}>
            {sequence.map((_, i) => {
              const c = slotColors(i);
              return (
                <View key={i} style={[styles.slot, { borderColor: c.border, backgroundColor: c.bg }]}>
                  <Text style={[styles.slotText, { color: t.text }]}>
                    {typed[i] ? mustById(typed[i]).romaji : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        {!confirmed ? (
          <View style={styles.tools}>
            <Pressable
              testID="readseq-back"
              accessibilityRole="button"
              accessibilityLabel="刪除一個"
              onPress={() => setTyped((s) => s.slice(0, -1))}
              style={styles.tool}
            >
              <Text style={{ fontSize: 14, color: t.muted }}>⌫ 刪除一個</Text>
            </Pressable>
            {__DEV__ ? (
              // 開發版本專用：一鍵填好正確答案，讓 Maestro 不用逐鍵點
              <Pressable testID="dev-solve" onPress={() => setTyped([...sequence])} style={styles.tool}>
                <Text style={{ fontSize: 10, color: t.muted }}>dev</Text>
              </Pressable>
            ) : null}
        <View style={styles.keyboard}>
          {rows.map((row, r) => (
            <View key={r} style={styles.keyRow}>
              {row.map((id, c) =>
                id ? (
                  <Pressable
                    key={c}
                    testID={`key-${mustById(id).romaji}`}
                    accessibilityRole="button"
                    accessibilityLabel={mustById(id).romaji}
                    disabled={confirmed}
                    onPress={() => press(id)}
                    style={({ pressed }) => [
                      styles.key,
                      { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.keyText, { color: t.text }]}>{mustById(id).romaji}</Text>
                  </Pressable>
                ) : (
                  <View key={c} style={[styles.key, { borderColor: 'transparent' }]} />
                ),
              )}
            </View>
          ))}
        </View>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.bottom}>
        {confirmed && result ? (
          <View style={styles.feedbackBox}>
            <Text
              testID="quiz-feedback"
              style={[styles.feedback, { color: result.correct ? t.correctText : t.wrongText }]}
            >
              {result.correct ? '答對了！' : '再看一次：'}
              {sequence.map((id) => mustById(id).romaji).join(' ')}
              {result.correct ? '' : '，等一下會再出現'}
            </Text>
            <View style={styles.actions}>
              <Pressable
                testID="readseq-play"
                accessibilityRole="button"
                accessibilityLabel="再聽一次"
                onPress={() => playSequence(sequence, { slow })}
                style={[styles.replay, { borderColor: t.line, backgroundColor: t.surface }]}
              >
                <Icon name="speaker" size={22} color={t.text} />
              </Pressable>
              <View style={styles.flex}>
                <PrimaryButton testID="quiz-next" label={isLast ? '完成，看結果' : '下一題'} onPress={onNext} />
              </View>
            </View>
          </View>
        ) : (
          <PrimaryButton
            testID="quiz-confirm"
            label={full ? '確認' : `輸入拼音（${typed.length}/${sequence.length}）`}
            disabled={!full}
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
  prompt: { paddingTop: 18, paddingHorizontal: 24, alignItems: 'center', gap: 6 },
  title: { fontSize: 15 },
  word: { letterSpacing: 6, textAlign: 'center' },
  slots: { flexDirection: 'row', gap: 6, paddingTop: 4 },
  slot: {
    minWidth: 52,
    height: 44,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: { fontSize: 18, fontWeight: '700' },
  keyboard: { paddingTop: 14, paddingHorizontal: 20, gap: 6 },
  keyRow: { flexDirection: 'row', gap: 6 },
  key: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 16, fontWeight: '600' },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 4 },
  tool: { minHeight: 36, paddingHorizontal: 12, justifyContent: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12 },
  feedbackBox: { gap: 10 },
  feedback: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  replay: {
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
