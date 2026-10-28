import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { audioMap } from './audioMap';

export interface PlayOptions {
  /** 慢速；沒有慢速檔時退回一般速度 */
  slow?: boolean;
}

/** 目前正在播的播放器；新的一次播放開始前會先停掉並釋放它。 */
let current: AudioPlayer | null = null;
/** 每次呼叫遞增；await 之後若發現已被更新的一次呼叫取代，就放棄這次（連點時以最後一次為準）。 */
let latestCall = 0;
let modeReady = false;

async function ensureAudioMode() {
  if (modeReady) return;
  modeReady = true;
  try {
    // 靜音鍵開啟時仍要能聽到發音
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  } catch {
    // 設定失敗不影響播放
  }
}

function releaseCurrent() {
  const p = current;
  current = null;
  if (!p) return;
  try {
    p.pause();
  } catch {
    // 已經釋放過就略過
  }
  try {
    p.remove();
  } catch {
    // 已經釋放過就略過
  }
}

/**
 * App 內所有發音都經過這個函式（kana id 或例字 id）。
 * 每次播放都建立新的播放器、釋放舊的：不重用同一個播放器做 replace／seekTo，
 * 避免真機上音檔還沒載入完或連續點擊時，後一次呼叫被前一次的非同步動作打斷而沒有聲音。
 * 找不到音檔或播放失敗時不丟錯（開發版會在 console 留下警告）。
 */
export async function playKana(id: string, options: PlayOptions = {}): Promise<void> {
  const entry = audioMap[id];
  if (!entry) return;
  const source = options.slow ? (entry.slow ?? entry.normal) : entry.normal;
  const call = ++latestCall;
  try {
    await ensureAudioMode();
    if (call !== latestCall) return; // 有更新的一次點擊接手了
    releaseCurrent();
    const player = createAudioPlayer(source);
    current = player;
    player.play();
  } catch (err) {
    if (__DEV__) console.warn(`playKana(${id}) 播放失敗`, err);
  }
}

/** 停止目前的發音（離開畫面等情況用）。 */
export function stopKana(): void {
  latestCall += 1;
  releaseCurrent();
}
