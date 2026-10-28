import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface CoachTipProps {
  /** 要不要顯示；false 時什麼都不渲染 */
  visible: boolean;
  /** 一行一則提示 */
  lines: string[];
  /** 點氣泡、點「知道了」或離開這個畫面時呼叫（只會呼叫一次） */
  onDismiss: () => void;
  testID?: string;
  /** 箭頭（指向上方的按鈕）對齊哪一側，預設置中 */
  arrowAlign?: 'center' | 'right';
  style?: StyleProp<ViewStyle>;
}

/**
 * 學新字的提示氣泡：反色小氣泡（亮色主題是深底、暗色主題是淺底）加朝上的小箭頭。
 * 排在版面裡（不是浮在畫面上），而且只有氣泡本身接收點擊，不會擋住底下的按鈕。
 */
export function CoachTip({ visible, lines, onDismiss, testID, arrowAlign = 'center', style }: CoachTipProps) {
  const t = useTheme();
  const done = useRef(false);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  const dismiss = () => {
    if (done.current) return;
    done.current = true;
    dismissRef.current();
  };

  // 看到氣泡後直接離開畫面也算看過，之後不再出現
  useEffect(() => {
    if (!visible) return undefined;
    return () => dismiss();
  }, [visible]);

  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, style]}>
      <View
        style={[
          styles.arrow,
          { borderBottomColor: t.text },
          arrowAlign === 'right' ? styles.arrowRight : styles.arrowCenter,
        ]}
      />
      <Pressable
        testID={testID}
        accessible={false}
        onPress={dismiss}
        style={[styles.bubble, { backgroundColor: t.text }]}
      >
        {lines.map((line) => (
          <Text key={line} style={[styles.line, { color: t.bg }]}>
            {line}
          </Text>
        ))}
        <Text style={[styles.ok, { color: t.bg }]}>知道了</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', paddingHorizontal: 32, marginTop: 6 },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowCenter: { alignSelf: 'center' },
  arrowRight: { alignSelf: 'flex-end', marginRight: 36 },
  bubble: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  line: { fontSize: 14, lineHeight: 21 },
  ok: { fontSize: 13, fontWeight: '700', alignSelf: 'flex-end', opacity: 0.75 },
});
