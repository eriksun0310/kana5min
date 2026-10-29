// 好笑記憶包：中文諧音梗（docs/architecture.md 第 12 節）。
// 清音以「讀音」（romaji）為 key；濁音、半濁音、拗音的 romaji 會重複（ぢ=ji 與じ），
// 改以平假名 kana id（h-ga、h-kya）為 key。兩者統稱「key」。片假名與平假名共用同一句。
// PUNS、VOICED_PUNS 由 scripts/gen-puns.mjs 從 kana-puns.md、kana-puns-dakuon-yoon.md 產生（只收標 ✅ 的句子，emoji 保留；整理規則見該腳本），其餘為手寫。

import kanaJson from './kana.json';

interface KanaRow {
  id: string;
  char: string;
  romaji: string;
  kind: string;
}

const KANA = kanaJson as KanaRow[];
const BY_ID = new Map(KANA.map((k) => [k.id, k]));

// <gen-puns:start>
// 由 scripts/gen-puns.mjs 從 kana-puns.md、kana-puns-dakuon-yoon.md 產生，請勿手改；
// 要改句子請改那兩份 markdown 後執行 pnpm gen:puns。
/** 清音：讀音（romaji）→ 平假名諧音句。 */
export const PUNS: Readonly<Record<string, string>> = {
  a: 'あ（啊）！老闆來了，快裝忙！ 🕺 💨',
  i: 'い（一）袋米要扛幾樓 🍚',
  u: 'う（嗚）嗚嗚，我的薪水呢？ 😭',
  e: 'え（欸）！你有沒有在聽我說話？ 👂',
  o: 'お（喔）？你要確欸？ 🤨',
  ka: '我的か （腳） 麻掉了啦！🦶 （台語）',
  ki: '你是 き（起）笑喔？（台語）',
  ku: '你是在く（哭）喔？ 🥹',
  ko: '你很こ（摳）憐欸！🥺 （台語）',
  sa: 'さ（殺）小？ 🤨 （台語）',
  shi: 'し（洗）勒靠喔 🥲❓（台語）',
  su: '這餅乾也太 す（酥）了吧！ 🍪',
  se: 'せ（誰）理你啊！ 🙄',
  so: 'そ（說）好的幸福呢？ 💔',
  ta: 'た（他）是不是有病？ 😷❓',
  chi: 'ち（去）你的啦！ 😤',
  te: 'て（拿）來！這個我先看到的！ ✋ （台語）',
  to: 'と（偷）偷喜歡我就直說！ ❤️',
  na: 'な（哪）有可能！ 😱',
  ni: 'に（你）好棒棒喔！ 👏',
  nu: 'ぬ（奴）才，還不給我罐罐！ 🐱',
  ne: '哪會按ね（餒）？ 🤔💭',
  no: 'の（NO）！我不要！ 🙅‍♀️',
  ha: 'は（哈）囉？你是不是忘記帶腦？ 🤨🧠',
  fu: 'ふ（服）了你，真的沒救了！ 🤦‍♀️',
  ho: 'ほ（齁）！我的假日又沒了！ 😭📅',
  ma: 'ま（媽）的！又要加班！ 🤡',
  mi: '氣到 み（咪）咪冒冒！ 😤💨 （台語）',
  mu: 'む（母）湯啦！ 🙅‍♀️',
  me: 'め（沒）錢了啦！ 🫠 💸',
  mo: '上班不要再 も（摸）魚了！ 🫳 🐟',
  ya: 'や（呀）咧呀咧，無法阻止的大小姐 🤵‍♂️',
  yu: '愛老虎ゆ！ 🐯',
  yo: 'よ（唷）！是在大聲什麼啦！👄💨',
  ra: '我要去ら（拉）屎了！ 💩',
  ri: 'り（哩）洗勒工三小？ 👄🤨 （台語）',
  ru: '今天晚餐吃 る（滷）肉飯！ 🐷🍚',
  re: '啊不然れ（咧）？ 💁‍♀️',
  ro: 'ろ（囉）哩八嗦！ 🙄',
  wa: 'わ（哇）！我居然記住五十音了！ 🎉🥳',
  wo: 'を（喔）！是喔！ 😯👌',
  n: 'ん（嗯）？你再說一次？ 🤔👂',
};

/** 濁音、半濁音、拗音：平假名 kana id（h-ga、h-kya…）→ 平假名諧音句（romaji 會重複，所以不用讀音當 key）。 */
export const VOICED_PUNS: Readonly<Record<string, string>> = {
  'h-za': 'ざ（炸）雞最好吃！🍗',
  'h-ji': 'じ（錢）拿來！💰（台語）',
  'h-ze': 'ぜ（這）個多少錢？💰（台語）',
  'h-zo': 'ぞ（走）啦！要遲到了！🏃（台語）',
  'h-do': 'ど（多）吃一點啦！🍚',
  'h-bi': 'び（鼻）子好癢！👃',
  'h-bu': 'ぶ（不）要吵啦！🤫',
  'h-be': 'べ（杯）子拿來！🥤',
  'h-cha': 'ちゃ（茶）來了！🧋',
  'h-chu': 'ちゅ（啾）～親一下！😘',
  'h-ja': 'じゃ（吃）飯啦！🍚（台語諧音）',
};
// <gen-puns:end>

/** 免費讀音：あ行與か行（10 個；け 目前沒有句子）。 */
export const FREE_SOUNDS: readonly string[] = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'];

/** 目前收錄的諧音梗總數（清音 + 濁音／半濁音／拗音）。 */
export const PUN_COUNT = Object.keys(PUNS).length + Object.keys(VOICED_PUNS).length;

/** 讀音是否免費（あ行與か行）。 */
export function isFreeSound(sound: string): boolean {
  return FREE_SOUNDS.includes(sound);
}

/** key 是否為清音的讀音（濁音、半濁音、拗音的 key 是 `h-` 開頭的 kana id）。 */
export function isSeionKey(key: string): boolean {
  return !key.startsWith('h-');
}

/**
 * 假名的諧音 key：清音回傳讀音（romaji）：`h-ku`、`k-ku` → `ku`；
 * 濁音、半濁音、拗音回傳平假名 id：`k-ga` → `h-ga`、`h-kya` → `h-kya`。
 * 不存在的 id 回傳 undefined。
 */
export function soundOf(kanaId: string): string | undefined {
  const k = BY_ID.get(kanaId);
  if (!k) return undefined;
  return k.kind === 'seion' ? k.romaji : `h-${kanaId.slice(2)}`;
}

/** key 對應的平假名 id（清音 `ku` → `h-ku`；濁音／拗音 key 本身就是 id）。 */
function hiraId(key: string): string {
  return isSeionKey(key) ? `h-${key}` : key;
}

const HIRA_START = 0x3041;
const HIRA_END = 0x3096;

function toKatakana(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code >= HIRA_START && code <= HIRA_END ? String.fromCodePoint(code + 0x60) : ch;
    })
    .join('');
}

/** 某 key 的諧音句（平假名原句）；沒有則 undefined。 */
export function punOfSound(key: string): string | undefined {
  return isSeionKey(key) ? PUNS[key] : VOICED_PUNS[key];
}

/** 某 key 的諧音句，片假名版（句中第一個對應平假名字元換成片假名；拗音整組兩個字一起換）。 */
export function punOfSoundKatakana(key: string): string | undefined {
  const pun = punOfSound(key);
  if (!pun) return undefined;
  const hira = BY_ID.get(hiraId(key))?.char;
  if (!hira) return pun;
  return pun.replace(hira, toKatakana(hira));
}

/**
 * 假名的諧音梗。平假名回傳原句；片假名回傳把句中第一個對應平假名換成片假名的句子
 * （く→ク：「你是在ク（哭）喔？」；きゃ→キャ）。沒有句子（未收錄）回傳 undefined。
 */
export function punFor(kanaId: string): string | undefined {
  const sound = soundOf(kanaId);
  if (!sound) return undefined;
  return kanaId.startsWith('k-') ? punOfSoundKatakana(sound) : punOfSound(sound);
}
