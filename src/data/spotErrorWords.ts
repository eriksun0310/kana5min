// 抓錯字（spoterr）用的詞庫。
// 候選詞在 words-spot-error.md，等使用者核可後才會加進 words.json、產音檔，並把 SPOT_ERROR_IN_PRACTICE 改成 true。
// 在那之前：正式版的詞池只有 words.json 裡「本來就有」且含 2 個以上易混淆字的詞（わかる、シャツ、ショッピング），
// 每種文字不到 3 個，所以抓錯字不會出現在自動練習。
// DEV_PLACEHOLDER_WORDS 是只給開發版（kana5min://quiz?mode=dev-spot）看介面用的佔位字串，不是真的詞、沒有音檔、不會進正式版。

import type { Word } from './types';

/** 是否開放把抓錯字放進自動練習（等詞庫夠了再改成 true，見 words-spot-error.md）。 */
export const SPOT_ERROR_IN_PRACTICE = false;

const ph = (id: string, text: string, script: Word['script']): Word => ({
  id: `dev-spot-${id}`,
  text,
  romaji: '(佔位)',
  meaning: '（佔位詞，不是真的詞）',
  script,
});

export const DEV_PLACEHOLDER_WORDS: Word[] = [
  ph('h1', 'ぬるめ', 'hiragana'),
  ph('h2', 'われろ', 'hiragana'),
  ph('h3', 'ねるわ', 'hiragana'),
  ph('h4', 'めぬれ', 'hiragana'),
  ph('h5', 'ろれる', 'hiragana'),
  ph('k1', 'シツソ', 'katakana'),
  ph('k2', 'ンシツ', 'katakana'),
  ph('k3', 'ツソン', 'katakana'),
  ph('k4', 'ソシン', 'katakana'),
];
