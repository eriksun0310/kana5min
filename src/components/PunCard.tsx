import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { byId, punFor, soundOf } from '../data';
import { isPunUnlocked } from '../logic/punUnlock';
import { useSettingsStore } from '../store/settingsStore';
import { useTheme } from '../theme/useTheme';
import { Card } from './Card';
import { Icon } from './Icon';
import { PunShareButton } from './PunShareButton';
import { PunUnlockSheet } from './PunUnlockSheet';

export interface PunCardProps {
  kanaId: string;
  /** 外層容器的版面樣式（留白用） */
  style?: object;
  /** 精簡版面（片假名學新字：畫面上已有兩張卡片，空間較擠） */
  compact?: boolean;
}

/**
 * 好笑記法卡片（F1／F2）：沒有諧音不渲染；已解鎖顯示句子；未解鎖顯示假裝模糊的灰條與解鎖鈕，
 * 點擊開解鎖面板。
 */
export function PunCard({ kanaId, style, compact }: PunCardProps) {
  const t = useTheme();
  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const unlocked = useSettingsStore((s) => s.punUnlocked);
  const [sheet, setSheet] = useState(false);

  const sound = soundOf(kanaId);
  const pun = punFor(kanaId);
  if (!sound || !pun) return null;

  const open = isPunUnlocked(sound, { purchased, unlocked });
  const script = byId(kanaId)?.script ?? 'hiragana';

  if (open) {
    return (
      <Card testID="pun-card" style={[compact && styles.cardCompact, style]}>
        <View style={styles.head}>
          <Text style={[styles.title, { color: t.accentText }]}>好笑記法</Text>
          <PunShareButton kanaId={kanaId} />
        </View>
        <Text style={[styles.body, { color: t.text }]}>{pun}</Text>
        <Text style={[styles.note, { color: t.muted }, compact && { marginTop: 4 }]}>
          諧音只是幫你記，念法以音檔為準
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Pressable
        testID="pun-locked"
        accessibilityRole="button"
        accessibilityLabel="解鎖諧音"
        onPress={() => setSheet(true)}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, style]}
      >
        <Card style={compact && styles.cardCompact}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: t.accentText }]}>好笑記法</Text>
            <Icon name="lock" size={16} color={t.muted} />
          </View>
          {/* 假裝模糊的文字：灰色圓角條 */}
          <View style={compact ? styles.compactRow : undefined}>
            <View style={[styles.bars, compact && styles.barsCompact]}>
              <View style={[styles.bar, { width: '100%', backgroundColor: t.track }]} />
              <View style={[styles.bar, { width: '78%', backgroundColor: t.track }]} />
              {compact ? null : (
                <View style={[styles.bar, { width: '52%', backgroundColor: t.track }]} />
              )}
            </View>
            <View
              style={[
                styles.cta,
                { backgroundColor: t.accentSoft },
                compact && styles.ctaCompact,
              ]}
            >
              <Text style={[styles.ctaText, { color: t.accentText }]}>解鎖諧音</Text>
            </View>
          </View>
        </Card>
      </Pressable>
      <PunUnlockSheet visible={sheet} sound={sound} script={script} onClose={() => setSheet(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  cardCompact: { paddingVertical: 12 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  barsCompact: { flex: 1, marginTop: 0, gap: 7 },
  ctaCompact: { marginTop: 0, minHeight: 36, paddingHorizontal: 14 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 12, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 23, marginTop: 4 },
  note: { fontSize: 12, marginTop: 8 },
  bars: { gap: 8, marginTop: 12 },
  bar: { height: 12, borderRadius: 6 },
  cta: {
    marginTop: 14,
    minHeight: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 14, fontWeight: '700' },
});
