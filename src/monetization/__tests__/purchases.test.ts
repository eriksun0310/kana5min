jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type PurchasesModule = typeof import('../purchases');
type SettingsModule = typeof import('../../store/settingsStore');

/** 每個測試載入一份全新的模組（configured 是模組內狀態）。 */
function load(key: string | undefined, mockSetup?: (p: any) => void) {
  let purchases!: PurchasesModule;
  let settings!: SettingsModule;
  let native!: any;
  jest.isolateModules(() => {
    if (key === undefined) delete process.env.EXPO_PUBLIC_RC_IOS_KEY;
    else process.env.EXPO_PUBLIC_RC_IOS_KEY = key;
    native = require('react-native-purchases').default;
    mockSetup?.(native);
    purchases = require('../purchases');
    settings = require('../../store/settingsStore');
  });
  return { purchases, settings, native };
}

const active = { entitlements: { active: { pun_pack: {} } } };
const lifetimePkg = { identifier: '$rc_lifetime', product: { priceString: 'NT$90', identifier: 'x' } };

afterEach(() => {
  delete process.env.EXPO_PUBLIC_RC_IOS_KEY;
});

describe('purchases（沒有 key）', () => {
  it('不 configure，所有函式回傳 unavailable／null，不丟錯', async () => {
    const { purchases, native } = load(undefined);
    await purchases.initPurchases();
    expect(native.configure).not.toHaveBeenCalled();
    expect(await purchases.getPunPackPrice()).toBeNull();
    expect(await purchases.buyPunPack()).toBe('unavailable');
    expect(await purchases.restorePunPack()).toBe('unavailable');
  });
});

describe('purchases（有 key）', () => {
  it('initPurchases：有 entitlement 就同步 punPackPurchased = true', async () => {
    const { purchases, settings, native } = load('test_key', (p) => {
      p.getCustomerInfo.mockResolvedValue(active);
    });
    settings.useSettingsStore.getState().setPunPackPurchased(false);
    await purchases.initPurchases();
    expect(native.configure).toHaveBeenCalledTimes(1);
    expect(settings.useSettingsStore.getState().punPackPurchased).toBe(true);
  });

  it('initPurchases：讀取失敗不回收已購買狀態', async () => {
    const { purchases, settings } = load('test_key', (p) => {
      p.getCustomerInfo.mockRejectedValue(new Error('offline'));
    });
    settings.useSettingsStore.getState().setPunPackPurchased(true);
    await purchases.initPurchases();
    expect(settings.useSettingsStore.getState().punPackPurchased).toBe(true);
  });

  it('getPunPackPrice：回傳 lifetime package 的在地化價格，失敗回傳 null', async () => {
    const ok = load('test_key', (p) => {
      p.getOfferings.mockResolvedValue({ current: { availablePackages: [lifetimePkg] } });
    });
    expect(await ok.purchases.getPunPackPrice()).toBe('NT$90');
    const bad = load('test_key', (p) => {
      p.getOfferings.mockRejectedValue(new Error('x'));
    });
    expect(await bad.purchases.getPunPackPrice()).toBeNull();
  });

  it('buyPunPack：成功寫入購買狀態、取消與錯誤分流', async () => {
    const ok = load('test_key', (p) => {
      p.getOfferings.mockResolvedValue({ current: { availablePackages: [lifetimePkg] } });
      p.purchasePackage.mockResolvedValue({ customerInfo: active });
    });
    ok.settings.useSettingsStore.getState().setPunPackPurchased(false);
    expect(await ok.purchases.buyPunPack()).toBe('purchased');
    expect(ok.settings.useSettingsStore.getState().punPackPurchased).toBe(true);

    const cancelled = load('test_key', (p) => {
      p.getOfferings.mockResolvedValue({ current: { availablePackages: [lifetimePkg] } });
      p.purchasePackage.mockRejectedValue({ userCancelled: true });
    });
    cancelled.settings.useSettingsStore.getState().setPunPackPurchased(false);
    expect(await cancelled.purchases.buyPunPack()).toBe('cancelled');
    expect(cancelled.settings.useSettingsStore.getState().punPackPurchased).toBe(false);

    const failed = load('test_key', (p) => {
      p.getOfferings.mockResolvedValue({ current: { availablePackages: [lifetimePkg] } });
      p.purchasePackage.mockRejectedValue(new Error('boom'));
    });
    expect(await failed.purchases.buyPunPack()).toBe('error');

    const noPkg = load('test_key', (p) => {
      p.getOfferings.mockResolvedValue({ current: null });
    });
    expect(await noPkg.purchases.buyPunPack()).toBe('unavailable');
  });

  it('restorePunPack：有 entitlement → restored 並寫入，沒有 → none，丟錯 → error', async () => {
    const yes = load('test_key', (p) => p.restorePurchases.mockResolvedValue(active));
    yes.settings.useSettingsStore.getState().setPunPackPurchased(false);
    expect(await yes.purchases.restorePunPack()).toBe('restored');
    expect(yes.settings.useSettingsStore.getState().punPackPurchased).toBe(true);

    const none = load('test_key');
    none.settings.useSettingsStore.getState().setPunPackPurchased(false);
    expect(await none.purchases.restorePunPack()).toBe('none');
    expect(none.settings.useSettingsStore.getState().punPackPurchased).toBe(false);

    const err = load('test_key', (p) => p.restorePurchases.mockRejectedValue(new Error('x')));
    expect(await err.purchases.restorePunPack()).toBe('error');
  });
});
