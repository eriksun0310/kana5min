import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { strokesOf } from '../data/strokes';
import { pathLength, traceTransform } from '../logic/trace';
import { useTheme } from '../theme/useTheme';
import { TianGrid } from './TianGrid';

/** 筆畫線寬（KanjiVG viewBox 單位；約等於設計檔字體的筆畫粗細） */
export const STROKE_WIDTH = 6;
/** 每個 viewBox 單位的畫線時間（毫秒），並限制單筆時間範圍 */
const MS_PER_UNIT = 14;
const MIN_STROKE_MS = 450;
const MAX_STROKE_MS = 900;
const GAP_MS = 180;
const START_DELAY_MS = 250;

export interface StrokeAnimationProps {
  char: string;
  /** 田字格邊長，設計檔為 320 */
  size?: number;
  /** 每次改變就從頭重播 */
  replayKey?: number;
  testID?: string;
}

interface Timeline {
  d: string;
  len: number;
  start: number;
  duration: number;
}

function buildTimeline(paths: string[]): { items: Timeline[]; total: number } {
  let t = START_DELAY_MS;
  const items = paths.map((d) => {
    const len = pathLength(d);
    const duration = Math.min(MAX_STROKE_MS, Math.max(MIN_STROKE_MS, len * MS_PER_UNIT));
    const item = { d, len, start: t, duration };
    t += duration + GAP_MS;
    return item;
  });
  return { items, total: t };
}

/**
 * 筆順動畫（C2-06）：田字格內用淡色畫出整個字，再用 text 色依序描出每一筆
 * （strokeDasharray／strokeDashoffset），正在畫的那一筆起點旁顯示主色圓形編號。
 * 動畫用 requestAnimationFrame 推進，沒有原生動畫依賴；畫完停在最後一筆。
 */
export function StrokeAnimation({ char, size = 320, replayKey = 0, testID }: StrokeAnimationProps) {
  const t = useTheme();
  const data = strokesOf(char);
  // TianGrid 有 1px 邊框，內容區是 size - 2
  const inner = size - 2;
  const tf = useMemo(() => traceTransform(inner, data?.viewBox), [inner, data?.viewBox]);
  const timeline = useMemo(() => buildTimeline(data?.strokes ?? []), [data]);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let raf = 0;
    const begin = Date.now();
    setElapsed(0);
    const tick = () => {
      const e = Date.now() - begin;
      setElapsed(Math.min(e, timeline.total));
      if (e < timeline.total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [replayKey, timeline]);

  if (!data) return <TianGrid size={size} testID={testID} />;

  // 目前正在畫（或最後畫完）的那一筆
  let current = -1;
  timeline.items.forEach((it, i) => {
    if (elapsed >= it.start) current = i;
  });
  const badge = current >= 0 ? data.numbers[current] : undefined;
  const badgeSize = 30;

  return (
    <TianGrid size={size} testID={testID}>
      <Svg
        width={inner}
        height={inner}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <G transform={`translate(${tf.offset} ${tf.offset}) scale(${tf.scale})`}>
          {data.strokes.map((d, i) => (
            <Path
              key={`ghost-${i}`}
              d={d}
              fill="none"
              stroke={t.faint}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {timeline.items.map((it, i) => {
            const p = Math.min(1, Math.max(0, (elapsed - it.start) / it.duration));
            if (p <= 0) return null;
            return (
              <Path
                key={`draw-${i}`}
                d={it.d}
                fill="none"
                stroke={t.text}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={`${it.len + 1} ${it.len + 1}`}
                strokeDashoffset={(1 - p) * (it.len + 1)}
              />
            );
          })}
        </G>
      </Svg>
      {badge ? (
        <View
          pointerEvents="none"
          style={[
            styles.badge,
            {
              backgroundColor: t.accent,
              left: badge[0] * tf.scale + tf.offset - badgeSize / 2,
              top: badge[1] * tf.scale + tf.offset - badgeSize / 2,
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: t.onAccent }]}>{current + 1}</Text>
        </View>
      ) : null}
    </TianGrid>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 15, fontWeight: '700' },
});
