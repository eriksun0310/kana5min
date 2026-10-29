import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { mustById, type Script } from '../data';
import { isSeionKey } from '../data/puns';
import { canWatchRewardedAd, nextUnlockBatch, shouldPromptPurchase } from '../logic/punUnlock';
import { showRewardedAd } from '../monetization/ads';
import { usePunPackPrice } from '../monetization/usePunPackPrice';
import { useSettingsStore } from '../store/settingsStore';
import { useBottomPad } from '../theme/layout';
import { useTheme } from '../theme/useTheme';
import { PrimaryButton, SecondaryButton } from './Buttons';
import { Icon } from './Icon';

export interface PunUnlockSheetProps {
  visible: boolean;
  /** 點到的 key：清音是讀音（romaji，例如 'sa'），濁音／拗音是平假名 id（例如 'h-ga'） */
  sound: string;
  /** 目前畫面的文字，決定「這次會解鎖的字」用平假名或片假名顯示 */
  script: Script;
  onClose: () => void;
}

type AdStatus = 'idle' | 'loading' | 'unavailable';

/** 解鎖面板：看廣告解鎖 3 個字（僅清音），或買斷全部解鎖；濁音、拗音只能買斷。 */
export function PunUnlockSheet({ visible, sound, script, onClose }: PunUnlockSheetProps) {
  const t = useTheme();
  const router = useRouter();
  const bottom = useBottomPad(24);
  const price = usePunPackPrice();
  const unlocked = useSettingsStore((s) => s.punUnlocked);
  const purchased = useSettingsStore((s) => s.punPackPurchased);
  const [status, setStatus] = useState<AdStatus>('idle');

  const batch = nextUnlockBatch(sound, unlocked);
  const prefix = script === 'katakana' ? 'k' : 'h';
  const chars = batch.map((s) => mustById(`${prefix}-${s}`).char).join('・');
  const loading = status === 'loading';
  const canWatch = canWatchRewardedAd(sound, { purchased, unlocked });

  const close = () => {
    setStatus('idle');
    onClose();
  };

  const watch = async () => {
    if (loading || !canWatch) return;
    setStatus('loading');
    const result = await showRewardedAd();
    if (result === 'rewarded') {
      const s = useSettingsStore.getState();
      s.unlockPuns(batch);
      const count = s.addPunAdWatched();
      const prompt = shouldPromptPurchase(count, useSettingsStore.getState().punPromptAfterAdsShown);
      if (prompt) useSettingsStore.getState().setPunPromptAfterAdsShown(true);
      close();
      if (prompt) router.push({ pathname: '/punpack', params: { from: 'ads' } });
      return;
    }
    // 中途關閉廣告：回到待命，不解鎖
    setStatus(result === 'unavailable' ? 'unavailable' : 'idle');
  };

  const buy = () => {
    close();
    router.push('/punpack');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.root} accessibilityViewIsModal>
        {/* 遮罩：不分主題都用黑色半透明，不屬於主題 token（同 OptionSheet） */}
        <Pressable
          accessibilityLabel="關閉"
          testID="pun-sheet-backdrop"
          style={[StyleSheet.absoluteFill, styles.scrim]}
          onPress={close}
        />
        <View
          testID="pun-sheet"
          style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.line, paddingBottom: bottom }]}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: t.text }]}>解鎖諧音梗</Text>
            <Pressable
              testID="pun-sheet-close"
              accessibilityRole="button"
              accessibilityLabel="關閉"
              onPress={close}
              style={styles.close}
            >
              <Icon name="close" size={20} color={t.muted} />
            </Pressable>
          </View>

          <View style={styles.watch}>
            {canWatch ? (
              <PrimaryButton
                testID="pun-watch-ad"
                label={loading ? '廣告載入中' : `看廣告解鎖 ${batch.length} 個字`}
                disabled={loading}
                onPress={watch}
              />
            ) : null}
            {loading ? (
              <View style={styles.loading} pointerEvents="none">
                <ActivityIndicator color={t.muted} />
              </View>
            ) : null}
          </View>
          {canWatch ? (
            <Text testID="pun-batch" style={[styles.batch, { color: t.muted }]}>
              這次會解鎖：{chars}
            </Text>
          ) : null}
          {!isSeionKey(sound) ? (
            <Text testID="pun-buy-only" style={[styles.batch, { color: t.muted }]}>
              濁音、拗音的諧音梗只能買斷解鎖
            </Text>
          ) : null}
          {status === 'unavailable' ? (
            <Text testID="pun-ad-unavailable" style={[styles.warn, { color: t.wrongText }]}>
              廣告暫時無法載入，請稍後再試
            </Text>
          ) : null}

          <SecondaryButton
            testID="pun-buy"
            label={`${price} 全部解鎖・永久免廣告`}
            style={styles.buy}
            onPress={buy}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: 'black', opacity: 0.45 },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 18,
    paddingHorizontal: 24,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '700' },
  close: { width: 44, height: 44, marginRight: -12, alignItems: 'center', justifyContent: 'center' },
  watch: { marginTop: 4, justifyContent: 'center' },
  loading: { position: 'absolute', right: 20, top: 0, bottom: 0, justifyContent: 'center' },
  batch: { fontSize: 13, textAlign: 'center', marginTop: 10 },
  warn: { fontSize: 13, textAlign: 'center', marginTop: 8 },
  buy: { marginTop: 18 },
});
