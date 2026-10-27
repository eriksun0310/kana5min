// 記憶小提示：階段 1 只有あ行與か行（免費範圍），內容取自 kana-puns.md。
// 其他行回傳 undefined，畫面不顯示卡片。

const HINTS: Record<string, string> = {
  'h-a': 'あ（啊）！我的手搖飲倒了！',
  'h-i': 'い（一）杯不夠，再來一杯！',
  'h-u': 'う（烏）龍麵要加大！',
  'h-e': 'え（欸）！你的拉鍊沒拉！',
  // お、け 在 kana-puns.md 標為 ❌（待換新句），先不顯示卡片。
  'h-ka': 'か（咖）哩飯今天特價！',
  'h-ki': '你是 き（起）笑喔？',
  'h-ku': '你是在く（哭）喔？',
  'h-ko': 'こ（扣）薪了啦，又遲到！',
};

/** 取得假名的記憶小提示；沒有則回傳 undefined。 */
export function hintFor(kanaId: string): string | undefined {
  return HINTS[kanaId];
}
