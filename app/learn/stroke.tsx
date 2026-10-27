import { Redirect, Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  BackHeader,
  FlowHeader,
  Icon,
  PrimaryButton,
  Screen,
} from '../../src/components';
import { StrokeAnimation } from '../../src/components/StrokeAnimation';
import { byId } from '../../src/data';
import { strokesOf } from '../../src/data/strokes';
import { useLearnSnapshot } from '../../src/hooks/useLearnSnapshot';
import { confirmExitFlow } from '../../src/nav/exitToHome';
import { useTheme } from '../../src/theme/useTheme';

/** C2-06 學新字・筆順（standalone=1 時為詳情頁進來的單獨查看） */
export default function LearnStroke() {
  const t = useTheme();
  const router = useRouter();
  const snap = useLearnSnapshot();
  const { width } = useWindowDimensions();
  const [replayKey, setReplayKey] = useState(0);
  const kana = snap.kanaId ? byId(snap.kanaId) : undefined;

  if (!kana || (!snap.standalone && !snap.active)) return <Redirect href="/" />;

  const count = strokesOf(kana.char)?.strokes.length ?? kana.strokes;
  const size = Math.min(320, width - 48);
  const desc =
    count === 1 ? '只有 1 畫，\n一筆寫完。' : `共 ${count} 畫，\n跟著圓圈裡的數字一筆一筆寫。`;

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: snap.standalone }} />
      {snap.standalone ? (
        <BackHeader title={`${kana.char}　筆順`} onBack={() => router.back()} />
      ) : (
        <FlowHeader
          progress={snap.progressAt(2)}
          countLabel={`${snap.index + 1}/${snap.total}`}
          onClose={() => confirmExitFlow(router)}
        />
      )}
      <View style={styles.titleBox}>
        <Text style={[styles.sub, { color: t.muted }]}>筆順</Text>
        <Text style={[styles.title, { color: t.text }]}>看一次怎麼寫</Text>
      </View>
      <View style={styles.canvasWrap}>
        <StrokeAnimation char={kana.char} size={size} replayKey={replayKey} testID="stroke-canvas" />
      </View>
      <View style={styles.infoRow}>
        <Text testID="stroke-desc" style={[styles.desc, { color: t.muted }]}>
          {desc}
        </Text>
        <Pressable
          testID="replay"
          accessibilityRole="button"
          accessibilityLabel="重播"
          onPress={() => setReplayKey((k) => k + 1)}
          style={({ pressed }) => [
            styles.replay,
            { borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Icon name="replay" size={18} color={t.text} />
          <Text style={[styles.replayLabel, { color: t.text }]}>重播</Text>
        </Pressable>
      </View>
      <View style={styles.flex} />
      <View style={styles.bottom}>
        {snap.standalone ? (
          <PrimaryButton testID="next-step" label="完成" onPress={() => router.back()} />
        ) : (
          <PrimaryButton
            testID="next-step"
            label="下一步：自己描一次"
            onPress={() => router.replace('/learn/trace')}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  titleBox: { paddingTop: 24, paddingHorizontal: 24, gap: 4 },
  sub: { fontSize: 13 },
  title: { fontSize: 22, fontWeight: '700' },
  canvasWrap: { paddingTop: 18, paddingHorizontal: 24, alignItems: 'center' },
  infoRow: {
    paddingTop: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  desc: { flex: 1, fontSize: 15, lineHeight: 22 },
  replay: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  replayLabel: { fontSize: 14 },
  bottom: { paddingHorizontal: 24, paddingBottom: 44 },
});
