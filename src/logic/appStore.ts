// 本 App 自己的商店連結：設定頁「給我們五星好評」「推薦給朋友」用。純資料與純函式。

export const IOS_APP_ID = '6827398112';
export const ANDROID_PACKAGE = 'com.ptalk.kana5min';

/** PTalk 學習地圖官網：設定頁「看全部 App」。 */
export const LEARNING_MAP_URL = 'https://p-talk-learning-map.vercel.app/';

/** 商店網頁版連結：分享用，也是評分頁打不開時的退路。 */
export function storeWebUrl(os: string): string {
  return os === 'android'
    ? `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`
    : `https://apps.apple.com/app/id${IOS_APP_ID}`;
}

/** 直接開商店的評分頁（不用 expo-store-review：Android 有配額，會點了沒反應）。 */
export function rateAppUrl(os: string): string {
  return os === 'android'
    ? `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`
    : `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review`;
}

/** 推薦給朋友的分享文字。 */
export function shareAppMessage(os: string): string {
  return `諧音五十音 — 用台灣人的諧音梗，輕鬆記住平假名和片假名！${storeWebUrl(os)}`;
}
