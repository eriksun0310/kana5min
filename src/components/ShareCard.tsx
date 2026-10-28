import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ShareCardData } from '../logic/shareCard';
import { KANA_FONT } from './KanaText';

/** 分享卡的設計邊長（pt）；輸出時由 view-shot 放大成 1080×1080 PNG。 */
export const SHARE_CARD_SIZE = 360;

export interface ShareCardProps {
  data: ShareCardData;
  /** 畫面上顯示的邊長，預設 360；內容依比例縮放 */
  size?: number;
}

/** 分享卡（F5）：大字、讀音、諧音句（梗用到的假名用強調色）、App 名稱。顏色來自 data.colors。 */
export function ShareCard({ data, size = SHARE_CARD_SIZE }: ShareCardProps) {
  const k = size / SHARE_CARD_SIZE;
  const c = data.colors;
  return (
    <View
      testID="share-card"
      collapsable={false}
      style={[styles.box, { width: size, height: size, backgroundColor: c.bg, padding: 28 * k }]}
    >
      <View style={styles.center}>
        <Text
          style={{ fontFamily: KANA_FONT, fontSize: 128 * k, lineHeight: 140 * k, color: c.text }}
        >
          {data.char}
        </Text>
        <Text style={{ fontSize: 18 * k, letterSpacing: 3 * k, color: c.muted, marginTop: 2 * k }}>
          {data.romaji}
        </Text>
        <Text
          style={{
            fontSize: 24 * k,
            lineHeight: 36 * k,
            color: c.text,
            textAlign: 'center',
            marginTop: 22 * k,
          }}
        >
          {data.segments.map((s, i) =>
            s.highlight ? (
              <Text key={i} style={{ color: c.accent, fontFamily: KANA_FONT }}>
                {s.text}
              </Text>
            ) : (
              <Text key={i}>{s.text}</Text>
            ),
          )}
        </Text>
      </View>
      <Text style={{ fontSize: 13 * k, fontWeight: '700', color: c.accent, textAlign: 'center' }}>
        {data.appName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
