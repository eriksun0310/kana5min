// 好笑記憶包：中文諧音梗（docs/architecture.md 第 12 節）。
// 以「讀音」（清音的 romaji）為 key，片假名與平假名共用同一句。
// PUNS 由 scripts/gen-puns.mjs 從 kana-puns.md 產生（只收標 ✅ 的句子，emoji 保留；整理規則見該腳本），其餘為手寫。

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
// 由 scripts/gen-puns.mjs 從 kana-puns.md 產生，請勿手改；要改句子請改 kana-puns.md 後執行 pnpm gen:puns。
/** 讀音 → 平假名諧音句。 */
export const PUNS: Readonly<Record<string, string>> = {
  a: 'あ（啊）！老闆來了，快裝忙！ 🕺 💨',
  i: 'い（一）袋米要扛幾樓 🍚',
  u: 'う（嗚）嗚嗚，我的薪水呢？ 😭',
  e: 'え（欸）！你有沒有在聽我說話？ 👂',
  o: 'お（喔）？你要確欸？ 🤨',
  ka: '我的か麻掉了啦！ 🦶',
  ki: '你是 き（起）笑喔？',
  ku: '你是在く（哭）喔？ 🥹',
  ko: '你很こ（摳）憐欸！ 🥺',
  sa: 'さ（殺）小？ 🤨',
  shi: 'し（洗）勒靠喔 🥲❓',
  su: '這餅乾也太 す（酥）了吧！ 🍪',
  se: 'せ（誰）理你啊！ 🙄',
  so: 'そ（說）好的幸福呢？ 💔',
  ta: 'た（他）是不是有病？ 😷❓',
  chi: 'ち（去）你的啦！ 😤',
  te: 'て（拿）來！這個我先看到的！ ✋',
  to: 'と（偷）偷喜歡我就直說！ ❤️',
  na: 'な（哪）有可能！ 😱',
  ni: 'に（你）好棒喔！ 👏',
  nu: 'ぬ（奴）才，還不給我罐罐！ 🐱',
  ne: '哪會按ね（餒）？ 🤔💭',
  no: 'の（NO）！我不要！ 🙅‍♀️',
  ha: 'は（哈）囉？你是不是忘記帶腦？ 🤨🧠',
  fu: 'ふ（服）了你，真的沒救了！ 🤦‍♀️',
  ho: 'ほ（齁）！我的假日又沒了！ 😭📅',
  ma: 'ま（媽）的！又要加班！ 🤡',
  mi: '氣到 み（咪）咪冒冒！ 😤💨',
  mu: 'む（母）湯啦！ 🙅‍♀️',
  me: 'め（沒）錢了啦！ 🫠 💸',
  mo: '上班不要再 も（摸）魚了！ 🫳 🐟',
  ya: 'や（呀）咧呀咧，無法阻止的大小姐 🤵‍♂️',
  yu: '愛老虎ゆ！ 🐯',
  yo: '你最好是 よ（唷）！ 😒',
  ra: '我要去ら（拉）屎了！ 💩',
  ri: 'り（哩）洗勒工三小？ 😠',
  ru: '今天晚餐吃 る（滷）肉飯！ 🍚',
  re: '啊不然れ（咧）？',
  ro: 'ろ（囉）哩八嗦！ 🙄',
  wa: 'わ（哇）！我居然記住五十音了！ 🎉🥳',
  wo: 'を（喔）！是喔！ 😯👌',
  n: 'ん（嗯）？你再說一次？ 🤔👂',
};
// <gen-puns:end>

/** 免費讀音：あ行與か行（10 個；け 目前沒有句子）。 */
export const FREE_SOUNDS: readonly string[] = ['a', 'i', 'u', 'e', 'o', 'ka', 'ki', 'ku', 'ke', 'ko'];

/** 目前收錄的諧音梗總數。 */
export const PUN_COUNT = Object.keys(PUNS).length;

/** 讀音是否免費（あ行與か行）。 */
export function isFreeSound(sound: string): boolean {
  return FREE_SOUNDS.includes(sound);
}

/**
 * 清音的 h-／k- id 回傳讀音（romaji）：`h-ku`、`k-ku` → `ku`。
 * 濁音、拗音與不存在的 id 回傳 undefined（沒有諧音）。
 */
export function soundOf(kanaId: string): string | undefined {
  const k = BY_ID.get(kanaId);
  return k && k.kind === 'seion' ? k.romaji : undefined;
}

const HIRA_START = 0x3041;
const HIRA_END = 0x3096;

function toKatakana(ch: string): string {
  const code = ch.codePointAt(0) ?? 0;
  return code >= HIRA_START && code <= HIRA_END ? String.fromCodePoint(code + 0x60) : ch;
}

/** 某讀音的諧音句（平假名原句）；沒有則 undefined。 */
export function punOfSound(sound: string): string | undefined {
  return PUNS[sound];
}

/** 某讀音的諧音句，片假名版（句中第一個對應平假名字元換成片假名）。 */
export function punOfSoundKatakana(sound: string): string | undefined {
  const pun = PUNS[sound];
  if (!pun) return undefined;
  const hira = BY_ID.get(`h-${sound}`)?.char;
  if (!hira) return pun;
  return pun.replace(hira, toKatakana(hira));
}

/**
 * 假名的諧音梗。平假名回傳原句；片假名回傳把句中第一個對應平假名換成片假名的句子
 * （く→ク：「你是在ク（哭）喔？」）。沒有句子（濁音、拗音、未收錄）回傳 undefined。
 */
export function punFor(kanaId: string): string | undefined {
  const sound = soundOf(kanaId);
  if (!sound) return undefined;
  return kanaId.startsWith('k-') ? punOfSoundKatakana(sound) : punOfSound(sound);
}
