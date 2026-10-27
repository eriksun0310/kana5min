// 記憶小提示：階段 1 只有あ行與か行（免費範圍），內容取自 kana-puns.md。
// 其他行回傳 undefined，畫面不顯示卡片。

const HINTS: Record<string, string> = {
  'h-a': 'あ（啊）！完蛋了啦！',
  'h-i': 'い（一）袋米要扛幾樓',
  'h-u': 'う（嗚）嗚嗚嗚',
  'h-e': 'え（欸）！等一下！',
  'h-o': 'お（喔）？你要確欸？',
  // か 的原句結尾有 emoji，畫面規範不放 emoji，所以去掉。
  'h-ka': '我的か麻掉了啦！',
  'h-ki': '你是 き（起）笑喔？',
  'h-ku': '你是在く（哭）喔？',
  // け 在 kana-puns.md 標為 ❌（待換新句），先不顯示卡片。
  'h-ko': '你很こ（摳）憐欸！',
};

/** 取得假名的記憶小提示；沒有則回傳 undefined。 */
export function hintFor(kanaId: string): string | undefined {
  return HINTS[kanaId];
}
