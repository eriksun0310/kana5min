// KanjiVG 筆畫資料的型別化存取（資料本身在 strokes.json，viewBox 109）。
import strokesJson from './strokes.json';

export interface StrokeData {
  viewBox: number;
  /** 每一筆的 SVG path（依筆順） */
  strokes: string[];
  /** 每一筆的筆順編號位置（viewBox 座標），與 strokes 同序 */
  numbers: [number, number][];
}

const table = strokesJson as unknown as Record<string, StrokeData>;

export function strokesOf(char: string): StrokeData | undefined {
  return table[char];
}
