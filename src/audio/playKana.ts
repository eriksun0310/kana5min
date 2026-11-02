import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { audioMap } from './audioMap';

export interface PlayOptions {
  /** 慢速；沒有慢速檔時退回一般速度 */
  slow?: boolean;
}

/** 一個聲音對應一個固定的播放器（預載之後點一下就有聲音，不用等音檔載入）。 */
interface Entry {
  player: AudioPlayer;
  /** 音檔已載入完成 */
  loaded: boolean;
  /** 使用者想播但還沒開始播（載入完成時要補一次 play） */
  want: boolean;
  sub: { remove: () => void } | null;
}

/** 最多同時保留幾個播放器；超過時釋放最久沒用的（目前正在播的不釋放）。 */
export const MAX_PLAYERS = 24;

/** key = `${id}|${slow ? 's' : 'n'}`；Map 依插入順序，最近用過的會被移到最後面。 */
const cache = new Map<string, Entry>();
let playing: Entry | null = null;
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

function destroy(e: Entry) {
  try {
    e.sub?.remove();
  } catch {
    // 已經移除過就略過
  }
  try {
    e.player.pause();
  } catch {
    // 已經釋放過就略過
  }
  try {
    e.player.remove();
  } catch {
    // 已經釋放過就略過
  }
}

function sourceOf(id: string, slow: boolean | undefined) {
  const entry = audioMap[id];
  if (!entry) return undefined;
  return slow ? (entry.slow ?? entry.normal) : entry.normal;
}

function entryFor(id: string, slow: boolean | undefined): Entry | undefined {
  const source = sourceOf(id, slow);
  if (source === undefined) return undefined;
  const key = `${id}|${slow ? 's' : 'n'}`;
  const hit = cache.get(key);
  if (hit) {
    cache.delete(key);
    cache.set(key, hit);
    return hit;
  }
  const player = createAudioPlayer(source);
  const e: Entry = { player, loaded: false, want: false, sub: null };
  try {
    e.sub = player.addListener('playbackStatusUpdate', (st) => {
      if (st.isLoaded) e.loaded = true;
      if (st.playing || st.didJustFinish) {
        e.want = false;
        return;
      }
      // 還沒載入完就被要求播放：載入完成的當下補一次 play
      if (st.isLoaded && e.want) player.play();
    });
  } catch {
    // 監聽失敗就維持直接播放的行為
  }
  cache.set(key, e);
  // 超過上限：釋放最久沒用的（跳過正在播的）
  for (const [k, old] of cache) {
    if (cache.size <= MAX_PLAYERS) break;
    if (old === playing || old === e) continue;
    cache.delete(k);
    destroy(old);
  }
  return e;
}

/**
 * 預載一批聲音（進題時呼叫）：先建立播放器讓音檔開始載入，使用者第一次點就不會因為還沒載入而沒聲音。
 * 找不到音檔的 id 略過；不會播放。
 */
export function preloadKana(ids: readonly string[], options: PlayOptions = {}): void {
  for (const id of ids) {
    try {
      entryFor(id, options.slow);
    } catch (err) {
      if (__DEV__) console.warn(`preloadKana(${id}) 失敗`, err);
    }
  }
}

/**
 * App 內所有發音都經過這個函式（kana id 或例字 id）。
 * 每個聲音有自己固定的播放器（不在同一個播放器上換檔），播放時先停掉另一個正在播的，
 * 播同一個聲音就從頭再播。還沒載入完就點的話，載入完成時會自動補播。
 * 找不到音檔或播放失敗時不丟錯（開發版會在 console 留下警告）。
 */
export async function playKana(id: string, options: PlayOptions = {}): Promise<void> {
  if (!audioMap[id]) return;
  const call = ++latestCall;
  try {
    await ensureAudioMode();
    if (call !== latestCall) return; // 有更新的一次點擊接手了
    const e = entryFor(id, options.slow);
    if (!e) return;
    if (playing && playing !== e) {
      playing.want = false;
      try {
        playing.player.pause();
      } catch {
        // 略過
      }
    }
    playing = e;
    e.want = true;
    if (e.loaded) {
      // 已經播過或預載完成：回到開頭再播（播完的播放器不先回到開頭就不會再出聲）
      try {
        await e.player.seekTo(0);
      } catch {
        // seekTo 失敗仍然嘗試播放
      }
      if (call !== latestCall) return;
    }
    e.player.play();
  } catch (err) {
    if (__DEV__) console.warn(`playKana(${id}) 播放失敗`, err);
  }
}

/** 停止目前的發音（離開畫面等情況用）。播放器保留，下次還能直接播。 */
export function stopKana(): void {
  latestCall += 1;
  if (!playing) return;
  playing.want = false;
  try {
    playing.player.pause();
  } catch {
    // 略過
  }
  playing = null;
}

/** 釋放所有播放器（測試用）。 */
export function releaseAllKana(): void {
  latestCall += 1;
  playing = null;
  for (const e of cache.values()) destroy(e);
  cache.clear();
}
