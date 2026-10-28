// 獎勵廣告（docs/architecture.md 第 12 節）。只用使用者主動點擊的獎勵廣告，不用插頁廣告。
// 所有請求 requestNonPersonalizedAdsOnly: true；不要求 ATT。
// 正式版 unit id 從環境變數讀（EXPO_PUBLIC_ADMOB_REWARDED_IOS／EXPO_PUBLIC_ADMOB_REWARDED_ANDROID），
// 沒有值就回報 unavailable。unit id 不寫進程式碼。

import { Platform } from 'react-native';
import mobileAds, {
  AdEventType,
  AdsConsent,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

export type RewardedResult = 'rewarded' | 'dismissed' | 'unavailable';

/** 廣告載入逾時（毫秒）。 */
export const AD_LOAD_TIMEOUT_MS = 15_000;

let initPromise: Promise<void> | null = null;

/** 第一次呼叫時才初始化：先收集同意（錯誤忽略），再 initialize()。 */
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await AdsConsent.gatherConsent();
      } catch {
        // 同意流程失敗（例如離線）就略過，仍以非個人化廣告請求
      }
      await mobileAds().initialize();
    })().catch((e) => {
      initPromise = null; // 失敗時下次再試
      throw e;
    });
  }
  return initPromise;
}

/** 目前平台的獎勵廣告 unit id；沒有設定回傳 null。 */
export function rewardedUnitId(): string | null {
  if (__DEV__) return TestIds.REWARDED;
  const id =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS
      : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID;
  return id ? id : null;
}

/**
 * 載入並顯示一支獎勵廣告。
 * - rewarded：收到 EARNED_REWARD（使用者看完）
 * - dismissed：載入成功並顯示過，但使用者提早關閉
 * - unavailable：沒有 unit id、初始化或載入失敗、載入逾時
 */
export async function showRewardedAd(): Promise<RewardedResult> {
  const unitId = rewardedUnitId();
  if (!unitId) return 'unavailable';
  try {
    await ensureInitialized();
  } catch {
    return 'unavailable';
  }

  return new Promise<RewardedResult>((resolve) => {
    let earned = false;
    let settled = false;
    const unsubs: (() => void)[] = [];
    const ad = RewardedAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });

    const finish = (result: RewardedResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubs.forEach((u) => u());
      resolve(result);
    };

    const timer = setTimeout(() => finish('unavailable'), AD_LOAD_TIMEOUT_MS);

    unsubs.push(
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        clearTimeout(timer);
        ad.show().catch(() => finish('unavailable'));
      }),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        earned = true;
      }),
      ad.addAdEventListener(AdEventType.CLOSED, () => {
        finish(earned ? 'rewarded' : 'dismissed');
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        finish('unavailable');
      }),
    );

    ad.load();
  });
}
