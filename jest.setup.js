// 原生廣告與內購模組在 jest 裡不存在：用最小 mock 取代，避免載入原生程式碼。
jest.mock('react-native-google-mobile-ads', () => {
  const unsub = () => {};
  const RewardedAd = {
    createForAdRequest: jest.fn(() => ({
      addAdEventListener: jest.fn(() => unsub),
      load: jest.fn(),
      show: jest.fn(() => Promise.resolve()),
    })),
  };
  const mobileAds = () => ({ initialize: jest.fn(() => Promise.resolve([])) });
  return {
    __esModule: true,
    default: mobileAds,
    RewardedAd,
    RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned_reward' },
    AdEventType: { CLOSED: 'closed', ERROR: 'error' },
    AdsConsent: { gatherConsent: jest.fn(() => Promise.resolve({})) },
    TestIds: { REWARDED: 'test-rewarded' },
  };
});

jest.mock('react-native-purchases', () => {
  const Purchases = {
    configure: jest.fn(),
    getCustomerInfo: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
    getOfferings: jest.fn(() => Promise.resolve({ current: null })),
    purchasePackage: jest.fn(() => Promise.reject({ userCancelled: true })),
    restorePurchases: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  };
  return {
    __esModule: true,
    default: Purchases,
    PACKAGE_TYPE: { LIFETIME: 'LIFETIME' },
  };
});
