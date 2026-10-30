import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/useTheme';
import { KanaText } from './KanaText';

export interface DropHowToProps {
  control: 'drag' | 'tap';
}

/** 掉字歸類怎麼玩：示範動畫（字掉下來 → 手指按住 → 拖到對的籃子，或點籃子）加三行說明。 */
export function DropHowTo({ control }: DropHowToProps) {
  const t = useTheme();
  const drag = control === 'drag';
  return (
    <View style={styles.wrap}>
      <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>怎麼玩</Text>
      <Demo drag={drag} />
      <View style={styles.steps}>
        <Text style={[styles.step, { color: t.text }]}>① 字會從上面掉下來，有時同時掉兩個</Text>
        {drag ? (
          <>
            <Text style={[styles.step, { color: t.text }]}>
              ② 用手指<Text style={{ fontWeight: '700' }}>按住</Text>它
            </Text>
            <Text style={[styles.step, { color: t.text }]}>
              ③ <Text style={{ fontWeight: '700' }}>拖到對的籃子</Text>再放開
            </Text>
          </>
        ) : (
          <Text style={[styles.step, { color: t.text }]}>
            ② <Text style={{ fontWeight: '700' }}>點對的籃子</Text>，最下面的字就會放進去
          </Text>
        )}
        <Text style={[styles.stepSmall, { color: t.muted }]}>
          一關 12 個字，錯 1 個以內算過關。放錯或掉到底不會結束遊戲，只是算錯一個。
        </Text>
      </View>
    </View>
  );
}

function Demo({ drag }: { drag: boolean }) {
  const t = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);

  const W = 280;
  const basketW = (W - 18) / 4;
  const targetX = 1 * (basketW + 6) + basketW / 2 - 26; // 第 2 個籃子（つ）
  const labels = ['し', 'つ', 'そ', 'ん'];

  const itemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.03, 0.78, 0.86, 1], [0, 1, 1, 0, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 0.28, 0.62, 1], [170, 170, targetX, targetX]) },
      { translateY: interpolate(p.value, [0, 0.2, 0.28, 0.62, 1], [0, 56, 56, 128, 128]) },
      { scale: interpolate(p.value, [0, 0.26, 0.3, 0.62, 0.7, 1], [1, 1, 1.15, 1.15, 1, 1]) },
    ],
  }));
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.22, 0.28, 0.64, 0.7, 1], [0, 0, 1, 1, 0, 0]),
    transform: drag
      ? [
          { translateX: interpolate(p.value, [0, 0.28, 0.62, 1], [170, 170, targetX, targetX]) + 18 },
          { translateY: interpolate(p.value, [0, 0.2, 0.28, 0.62, 1], [0, 56, 56, 128, 128]) + 22 },
        ]
      : [{ translateX: targetX + 18 }, { translateY: 170 }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.62, 0.66, 0.8, 0.9, 1], [0, 0, 1, 1, 0, 0]),
  }));

  return (
    <View style={[styles.demo, { width: W }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.demoItem, { backgroundColor: t.surface, borderColor: t.line }, itemStyle]}>
        <KanaText size={30} lineHeightRatio={1.2}>
          ツ
        </KanaText>
      </Animated.View>
      <View style={styles.demoBaskets}>
        {labels.map((l, i) => (
          <View key={l} style={[styles.demoBasket, { width: basketW, borderColor: t.line, backgroundColor: t.surface }]}>
            {i === 1 ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: t.correctSoft, borderColor: t.correct, borderWidth: 2, borderRadius: 14 }, flashStyle]}
              />
            ) : null}
            <KanaText size={24} lineHeightRatio={1.2}>
              {l}
            </KanaText>
          </View>
        ))}
      </View>
      <Animated.View style={[styles.finger, { backgroundColor: t.accent }, fingerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  demo: { height: 200, marginVertical: 12 },
  demoItem: { position: 'absolute', left: 0, top: 0, width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  demoBaskets: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 6 },
  demoBasket: { height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  finger: { position: 'absolute', left: 0, top: 0, width: 34, height: 34, borderRadius: 17, opacity: 0.55 },
  steps: { alignSelf: 'stretch', gap: 6, paddingTop: 4 },
  step: { fontSize: 16, lineHeight: 24 },
  stepSmall: { fontSize: 13, lineHeight: 20, paddingTop: 4 },
});
