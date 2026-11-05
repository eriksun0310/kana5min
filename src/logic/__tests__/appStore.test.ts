import { rateAppUrl, shareAppMessage, storeWebUrl } from '../appStore';

describe('appStore', () => {
  it('iOS 評分開 App Store 的寫評論頁', () => {
    expect(rateAppUrl('ios')).toBe('itms-apps://itunes.apple.com/app/id6827398112?action=write-review');
  });

  it('Android 評分開 Google Play 的評論頁', () => {
    expect(rateAppUrl('android')).toBe('market://details?id=com.ptalk.kana5min&showAllReviews=true');
  });

  it('網頁版連結依平台分開', () => {
    expect(storeWebUrl('ios')).toBe('https://apps.apple.com/app/id6827398112');
    expect(storeWebUrl('android')).toBe('https://play.google.com/store/apps/details?id=com.ptalk.kana5min');
  });

  it('分享文字帶 App 名稱與對應平台的商店網址', () => {
    expect(shareAppMessage('ios')).toContain('諧音五十音');
    expect(shareAppMessage('ios')).toContain('https://apps.apple.com/app/id6827398112');
    expect(shareAppMessage('android')).toContain('https://play.google.com/store/apps/details?id=com.ptalk.kana5min');
  });
});
