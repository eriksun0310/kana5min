import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 設計檔以 390×844 為基準，頂端的 52／56px 已包含狀態列。
 * 實機上以安全區為上限：有瀏海時不超過設計值，沒有安全區（例如測試環境）時直接用設計值。
 */
export function capInset(design: number, inset: number): number {
  return inset > 0 ? Math.min(design, inset) : design;
}

export function useTopPad(design: number): number {
  return capInset(design, useSafeAreaInsets().top);
}

export function useBottomPad(design: number): number {
  return capInset(design, useSafeAreaInsets().bottom);
}
