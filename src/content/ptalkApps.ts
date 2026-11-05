// PTalk 全部 App 的名單（推薦卡與設定頁「推薦給你」共用）。
// `released: false` 的不顯示（審核中，或就是自己）。上架後把它改成 true 即可。

export type PtalkAppGroup = 'jp' | 'en';

export interface PtalkApp {
  id: string;
  name: string;
  /** 一句話介紹 */
  tagline: string;
  group: PtalkAppGroup;
  iosUrl: string;
  androidUrl: string;
  released: boolean;
}

const play = (pkg: string) => `https://play.google.com/store/apps/details?id=${pkg}`;
const apple = (id: string) => `https://apps.apple.com/app/id${id}`;

/** 本 App 自己的 id：不推薦自己。 */
export const SELF_APP_ID = 'kana5min';

export const PTALK_APPS: PtalkApp[] = [
  {
    id: 'sushijp',
    name: '壽司日檢',
    tagline: '每天 5 分鐘背日檢單字',
    group: 'jp',
    iosUrl: apple('6774095306'),
    androidUrl: play('com.ptalk.sushijp'),
    released: true,
  },
  {
    id: 'kaitensushi',
    name: '壽司轉珠',
    tagline: '玩轉珠遊戲拼出單字',
    group: 'jp',
    // TODO: App Store id 待查（審核中）；目前先用 bundle id 備用，上架後換成 id 連結
    iosUrl: 'https://apps.apple.com/app/com.kaitensushi',
    androidUrl: play('com.ptalk.kaitensushi'),
    released: false,
  },
  {
    id: 'ninbato',
    name: '忍者信鴿',
    tagline: '闖關練聽力、文法、閱讀',
    group: 'jp',
    iosUrl: apple('6782623839'),
    androidUrl: play('com.ptalk.ninjapigeon'),
    released: true,
  },
  {
    id: 'hitofude',
    name: '日日一字',
    tagline: '一天一個字，手寫練習',
    group: 'jp',
    iosUrl: apple('6799118226'),
    androidUrl: play('com.ptalk.hitofude'),
    released: true,
  },
  {
    id: 'kana5min',
    name: '諧音五十音',
    tagline: '用中文諧音記住五十音',
    group: 'jp',
    iosUrl: apple('6827398112'),
    androidUrl: play('com.ptalk.kana5min'),
    released: false,
  },
  {
    id: 'koko',
    name: 'KOKO',
    tagline: '生活場景，一句句開口說',
    group: 'en',
    iosUrl: apple('6790465413'),
    androidUrl: play('com.ptalk.koko'),
    released: true,
  },
  {
    id: 'pizzatoeic',
    name: '披薩多益',
    tagline: '每天 5 分鐘刷多益單字',
    group: 'en',
    iosUrl: apple('6790264861'),
    androidUrl: play('com.ptalk.pizzatoeic'),
    released: true,
  },
  {
    id: 'roosterhero',
    name: '公雞超人',
    tagline: '職場情境練多益題目',
    group: 'en',
    iosUrl: apple('6792789892'),
    androidUrl: play('com.ptalk.roosterhero'),
    released: true,
  },
];

/** 已上架、且不是自己的 App；可指定分組。 */
export function listOtherApps(group?: PtalkAppGroup): PtalkApp[] {
  return PTALK_APPS.filter(
    (a) => a.released && a.id !== SELF_APP_ID && (!group || a.group === group),
  );
}

export function findApp(id: string): PtalkApp | undefined {
  return PTALK_APPS.find((a) => a.id === id);
}

/** 設定頁「推薦給你」的優先順序（最相關的在前）。 */
const RECOMMEND_ORDER = ['sushijp', 'kaitensushi', 'hitofude', 'pizzatoeic'];

/** 最相關、已上架、不是自己的前 N 款（預設 3 款）。 */
export function recommendedApps(limit = 3): PtalkApp[] {
  return RECOMMEND_ORDER.map(findApp)
    .filter((a): a is PtalkApp => !!a && a.released && a.id !== SELF_APP_ID)
    .slice(0, limit);
}

/** 畢業後推薦的 App：第一個已上架的，沒有就回傳 undefined。 */
export function graduateRecommendation(): PtalkApp | undefined {
  const ids = ['sushijp', 'kaitensushi'];
  return ids.map(findApp).find((a) => a && a.released && a.id !== SELF_APP_ID);
}

/** 依平台挑商店連結與名稱。 */
export function storeLinkFor(os: string, app: PtalkApp): { url: string; storeName: 'App Store' | 'Google Play' } {
  return os === 'android'
    ? { url: app.androidUrl, storeName: 'Google Play' }
    : { url: app.iosUrl, storeName: 'App Store' };
}
