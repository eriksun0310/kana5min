// 好笑記憶包買斷（RevenueCat；docs/architecture.md 第 12 節）。
// key 讀 EXPO_PUBLIC_RC_IOS_KEY／EXPO_PUBLIC_RC_ANDROID_KEY；沒有 key 就不 configure，
// 所有函式回傳 unavailable，App 其他功能照常。key 不寫進任何檔案，也不 log。
// entitlement `pun_pack`；offering `default` 的 lifetime package（$rc_lifetime），
// 產品 com.ptalk.kana5min.punpack。

import { Platform } from 'react-native';
import Purchases, {
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { useSettingsStore } from '../store/settingsStore';

export const PUN_PACK_ENTITLEMENT = 'pun_pack';
export const PUN_PACK_PRODUCT_ID = 'com.ptalk.kana5min.punpack';
/** 商店抓不到價格時畫面顯示的備用價格 */
export const FALLBACK_PRICE = 'NT$90';

export type BuyResult = 'purchased' | 'cancelled' | 'error' | 'unavailable';
export type RestoreResult = 'restored' | 'none' | 'error' | 'unavailable';

let configured = false;

function apiKey(): string | undefined {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  return key ? key : undefined;
}

/** 設定 RevenueCat；沒有 key 或原生模組缺席回傳 false。可重複呼叫。 */
function ensureConfigured(): boolean {
  if (configured) return true;
  const key = apiKey();
  if (!key) return false;
  if (!Purchases || typeof Purchases.configure !== 'function') return false;
  try {
    Purchases.configure({ apiKey: key });
    configured = true;
    return true;
  } catch {
    return false;
  }
}

function hasPunPack(info: CustomerInfo): boolean {
  return info.entitlements.active[PUN_PACK_ENTITLEMENT] !== undefined;
}

function markPurchased() {
  useSettingsStore.getState().setPunPackPurchased(true);
}

/** App 啟動時呼叫。成功後讀 customerInfo，有 entitlement 就把 punPackPurchased 設為 true。 */
export async function initPurchases(): Promise<void> {
  if (!ensureConfigured()) return;
  try {
    const info = await Purchases.getCustomerInfo();
    // 讀取失敗（離線）時不會走到這裡，也不會回收已購買狀態
    if (hasPunPack(info)) markPurchased();
  } catch {
    // 離線或商店問題：保留本機狀態
  }
}

async function lifetimePackage(): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  return (
    pkgs.find((p) => p.identifier === '$rc_lifetime') ??
    pkgs.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME) ??
    pkgs.find((p) => p.product.identifier === PUN_PACK_PRODUCT_ID) ??
    null
  );
}

/** 商店在地化價格字串；沒設定或失敗回傳 null（畫面 fallback「NT$90」）。 */
export async function getPunPackPrice(): Promise<string | null> {
  if (!ensureConfigured()) return null;
  try {
    const pkg = await lifetimePackage();
    return pkg?.product.priceString ?? null;
  } catch {
    return null;
  }
}

/** 買斷。成功即寫入 punPackPurchased = true。 */
export async function buyPunPack(): Promise<BuyResult> {
  if (!ensureConfigured()) return 'unavailable';
  try {
    const pkg = await lifetimePackage();
    if (!pkg) return 'unavailable';
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    if (hasPunPack(customerInfo)) {
      markPurchased();
      return 'purchased';
    }
    return 'error';
  } catch (e) {
    if ((e as { userCancelled?: boolean } | null)?.userCancelled) return 'cancelled';
    return 'error';
  }
}

/** 恢復購買。有 entitlement 即寫入 punPackPurchased = true。 */
export async function restorePunPack(): Promise<RestoreResult> {
  if (!ensureConfigured()) return 'unavailable';
  try {
    const info = await Purchases.restorePurchases();
    if (hasPunPack(info)) {
      markPurchased();
      return 'restored';
    }
    return 'none';
  } catch {
    return 'error';
  }
}
