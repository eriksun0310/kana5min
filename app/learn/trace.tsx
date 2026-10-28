import { Redirect, Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  BackHeader,
  CoachTip,
  FlowHeader,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '../../src/components';
import { TraceCanvas } from '../../src/components/TraceCanvas';
import { byId } from '../../src/data';
import { strokesOf } from '../../src/data/strokes';
import { useLearnSnapshot } from '../../src/hooks/useLearnSnapshot';
import { evaluateTrace, type Stroke } from '../../src/logic/trace';
import { confirmExitFlow } from '../../src/nav/exitToHome';
import { useSessionStore } from '../../src/store/sessionStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTheme } from '../../src/theme/useTheme';

/** 每個新字要描幾次 */
const TRACE_ROUNDS = 2;

/** C2-07 學新字・描寫（standalone=1 時只描一次，完成後返回） */
export default function LearnTrace() {
  const t = useTheme();
  const router = useRouter();
  const snap = useLearnSnapshot();
  const { width } = useWindowDimensions();
  const kana = snap.kanaId ? byId(snap.kanaId) : undefined;
  const tipSeen = useSettingsStore((s) => s.learnTipsSeen.trace);

  const [attempt, setAttempt] = useState(1);
  const [canvasKey, setCanvasKey] = useState(0);
  const [hint, setHint] = useState(false);
  const strokesRef = useRef<Stroke[]>([]);
  const devPassRef = useRef(false);

  if (!kana || (!snap.standalone && !snap.active)) return <Redirect href="/" />;

  const size = Math.min(342, width - 48);
  const rounds = snap.standalone ? 1 : TRACE_ROUNDS;

  const clearCanvas = () => {
    strokesRef.current = [];
    devPassRef.current = false;
    setHint(false);
    setCanvasKey((k) => k + 1);
  };

  const onDone = () => {
    const reference = strokesOf(kana.char)?.strokes ?? [];
    const passed = devPassRef.current || evaluateTrace(strokesRef.current, reference).passed;
    if (!passed) {
      setHint(true);
      return;
    }
    if (attempt < rounds) {
      setAttempt(attempt + 1);
      clearCanvas();
      return;
    }
    if (snap.standalone) {
      router.back();
      return;
    }
    const next = useSessionStore.getState().advanceNew();
    router.replace(next === 'next' ? '/learn/intro' : '/quiz');
  };

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: snap.standalone }} />
      {snap.standalone ? (
        <BackHeader title={`${kana.char}　描寫`} onBack={() => router.back()} />
      ) : (
        <FlowHeader
          progress={snap.progressAt(3)}
          countLabel={`${snap.index + 1}/${snap.total}`}
          onClose={() => confirmExitFlow(router)}
        />
      )}
      <View style={styles.titleBox}>
        <Text testID="trace-attempt" style={[styles.sub, { color: t.muted }]}>
          {snap.standalone ? '描寫' : `第 ${attempt} 次／共 ${rounds} 次`}
        </Text>
        <Text style={[styles.title, { color: t.text }]}>照著淡色的字描一次</Text>
      </View>
      <View style={styles.canvasWrap}>
        <TraceCanvas
          key={canvasKey}
          char={kana.char}
          size={size}
          onStrokesChange={(s) => {
            strokesRef.current = s;
            if (hint) setHint(false);
          }}
          onDevPass={
            __DEV__
              ? () => {
                  devPassRef.current = true;
                }
              : undefined
          }
        />
      </View>
      <View style={styles.hintBox}>
        <CoachTip
          visible={!tipSeen}
          lines={['用手指照著筆順描一次']}
          testID="coach-trace"
          onDismiss={() => useSettingsStore.getState().setLearnTipSeen('trace')}
        />
        {hint ? (
          <Text testID="trace-hint" style={[styles.hint, { color: t.accentText }]}>
            再照著淡色的字描描看
          </Text>
        ) : null}
      </View>
      <View style={styles.bottom}>
        <SecondaryButton testID="trace-redo" label="重寫" onPress={clearCanvas} style={styles.half} />
        <PrimaryButton testID="trace-done" label="完成" onPress={onDone} style={styles.half} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBox: { paddingTop: 24, paddingHorizontal: 24, gap: 4 },
  sub: { fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700' },
  canvasWrap: { paddingTop: 18, paddingHorizontal: 24, alignItems: 'center' },
  hintBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  hint: { fontSize: 15, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 44, flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
