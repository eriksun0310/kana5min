import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import type { MnemonicMark } from '../data/mnemonics';
import { strokesOf } from '../data/strokes';
import { pathLength } from '../logic/trace';
import { useTheme } from '../theme/useTheme';

const STROKE_WIDTH = 6;
/** 紅色標記畫一遍的時間，之後停一下再重播 */
const DRAW_MS = 1100;
const HOLD_MS = 1300;

export interface MnemonicGlyphProps {
  char: string;
  size?: number;
  marks?: MnemonicMark[];
  testID?: string;
}

/**
 * 「你可以這樣記」的字：用筆畫資料畫字，要提醒的地方用紅色疊上去（描筆畫或圈一個橢圓）並重複播放，
 * 讓人看到筆畫是往哪個方向走。沒有標記時只畫字。
 */
export function MnemonicGlyph({ char, size = 120, marks, testID }: MnemonicGlyphProps) {
  const t = useTheme();
  const data = strokesOf(char);
  const [p, setP] = useState(0);
  const hasMarks = !!marks && marks.length > 0;

  useEffect(() => {
    if (!hasMarks) return;
    let raf = 0;
    const begin = Date.now();
    const tick = () => {
      const e = (Date.now() - begin) % (DRAW_MS + HOLD_MS);
      setP(Math.min(1, e / DRAW_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hasMarks, char]);

  const lens = useMemo(() => (data ? data.strokes.map((d) => pathLength(d)) : []), [data]);
  if (!data) return <View style={{ width: size, height: size }} />;

  const scale = size / data.viewBox;
  return (
    <View testID={testID} style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G transform={`scale(${scale})`}>
          {data.strokes.map((d, i) => (
            <Path
              key={`s-${i}`}
              d={d}
              fill="none"
              stroke={t.text}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {marks?.map((m, mi) => {
            if (m.kind === 'ellipse') {
              // 橢圓用 strokeDasharray 沿圓周畫出來
              const circ = 2 * Math.PI * ((m.rx + m.ry) / 2);
              return (
                <Ellipse
                  key={`m-${mi}`}
                  cx={m.cx}
                  cy={m.cy}
                  rx={m.rx}
                  ry={m.ry}
                  fill="none"
                  stroke={t.wrong}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeDasharray={`${circ + 1} ${circ + 1}`}
                  strokeDashoffset={(1 - p) * (circ + 1)}
                  transform={`rotate(-90 ${m.cx} ${m.cy})`}
                />
              );
            }
            // 描筆畫：依序一筆一筆畫紅色
            const n = m.indexes.length;
            return m.indexes.map((si, k) => {
              const local = Math.min(1, Math.max(0, p * n - k));
              if (local <= 0) return null;
              const len = lens[si] ?? 0;
              return (
                <Path
                  key={`m-${mi}-${si}`}
                  d={data.strokes[si]}
                  fill="none"
                  stroke={t.wrong}
                  strokeWidth={STROKE_WIDTH + 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={`${len + 1} ${len + 1}`}
                  strokeDashoffset={(1 - local) * (len + 1)}
                />
              );
            });
          })}
        </G>
      </Svg>
    </View>
  );
}
