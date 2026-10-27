import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { audioMap } from './audioMap';

export interface PlayOptions {
  /** 慢速；沒有慢速檔時退回一般速度 */
  slow?: boolean;
}

let player: AudioPlayer | null = null;
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

/**
 * App 內所有發音都經過這個函式（kana id 或例字 id）。
 * 找不到音檔或播放失敗時安靜略過，不丟錯。
 */
export async function playKana(id: string, options: PlayOptions = {}): Promise<void> {
  const entry = audioMap[id];
  if (!entry) return;
  const source = options.slow ? (entry.slow ?? entry.normal) : entry.normal;
  try {
    await ensureAudioMode();
    if (!player) {
      player = createAudioPlayer(source);
    } else {
      player.pause();
      player.replace(source);
    }
    await player.seekTo(0);
    player.play();
  } catch {
    // 靜默略過
  }
}
