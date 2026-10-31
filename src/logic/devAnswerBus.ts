// 開發版測試用：測驗畫面上的「DEV 自動答案」按鈕透過這裡通知目前這一題的元件，
// 元件各自把「正確答案」選好（或填好、翻開），使用者再自己按確認／下一題看回饋對不對。
// 正式版不會註冊任何監聽（`__DEV__` 為 false），這個檔案本身沒有任何畫面文字。
import { useEffect, useRef } from 'react';

const listeners = new Set<() => void>();

/** 通知目前這一題的元件把答案選好。回傳有幾個元件回應（0 代表這一題沒有註冊）。 */
export function triggerDevAnswer(): number {
  let n = 0;
  listeners.forEach((l) => {
    l();
    n += 1;
  });
  return n;
}

/** 題目元件呼叫：只在開發版註冊，handler 會用最新一次 render 的版本。 */
export function useDevAnswer(handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!__DEV__) return undefined;
    const l = () => ref.current();
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
}
