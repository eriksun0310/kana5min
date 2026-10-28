import * as Sharing from 'expo-sharing';
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { buildShareCard } from '../logic/shareCard';
import { useTheme, useThemeName } from '../theme/useTheme';
import { Icon } from './Icon';
import { ShareCard } from './ShareCard';

/** 輸出圖片邊長（px） */
const OUTPUT_PX = 1080;

/**
 * 諧音梗分享圖示：畫面外渲染分享卡 → view-shot 轉 PNG → 系統分享面板（不需相簿權限）。
 * 沒有諧音句的字不渲染。
 */
export function PunShareButton({ kanaId }: { kanaId: string }) {
  const t = useTheme();
  const themeName = useThemeName();
  const data = useMemo(() => buildShareCard(kanaId, themeName), [kanaId, themeName]);
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const onShare = async () => {
    if (busy || !ref.current) return;
    setBusy(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('無法分享', '這台裝置不支援分享功能');
        return;
      }
      const uri = await captureRef(ref, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: OUTPUT_PX,
        height: OUTPUT_PX,
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
    } catch {
      Alert.alert('分享失敗', '請稍後再試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        testID="pun-share"
        accessibilityRole="button"
        accessibilityLabel="分享諧音梗"
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
        onPress={onShare}
        style={styles.btn}
      >
        <Icon name="share" size={18} color={t.muted} />
      </Pressable>
      {/* 畫面外渲染，只供擷取 */}
      <View pointerEvents="none" style={styles.offscreen}>
        <View ref={ref} collapsable={false}>
          <ShareCard data={data} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  offscreen: { position: 'absolute', left: -2000, top: 0 },
});
