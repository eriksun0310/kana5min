import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { strokesOf } from '../data/strokes';
import { toViewBox, traceTransform, type Point, type Stroke } from '../logic/trace';
import { useTheme } from '../theme/useTheme';
import { STROKE_WIDTH } from './StrokeAnimation';
import { TianGrid } from './TianGrid';

/** 使用者描線的粗細（像素，設計檔 C2-07 為 16） */
const USER_LINE_WIDTH = 16;
/** 開發版本長按多久視為通過（Maestro 用） */
const DEV_LONG_PRESS_MS = 1000;
/** 長按期間手指移動超過這個距離就不算長按 */
const LONG_PRESS_SLOP = 12;

export interface TraceCanvasProps {
  char: string;
  /** 田字格邊長，設計檔為 342 */
  size?: number;
  /** 每畫完一筆（手指離開）就回報目前全部筆畫，座標為 KanjiVG viewBox 座標 */
  onStrokesChange?: (strokes: Stroke[]) => void;
  /** 只在 __DEV__ 有效：長按畫布 1 秒呼叫一次，視為通過 */
  onDevPass?: () => void;
  /** 要用強調色亮起來的標準筆畫索引（漏掉的筆），亮起時閃爍約 2 秒後持續亮著 */
  highlight?: number[];
  testID?: string;
}

/** 漏掉的筆閃爍：週期與總時間 */
const BLINK_MS = 350;
const BLINK_TOTAL_MS = 2000;

function toPathD(points: Point[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  // 單點（輕點）補一個極小位移，讓圓角線頭畫出一個點
  const body = rest.length > 0 ? rest : [{ x: first.x + 0.01, y: first.y }];
  return `M${first.x.toFixed(1)} ${first.y.toFixed(1)}${body.map((p) => ` L${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('')}`;
}

/**
 * 描寫畫布（C2-07）：田字格內用 KanjiVG 路徑以 faint 色畫出淡色的字，
 * 手指軌跡（PanResponder）畫成 text 色 16px 圓頭線。
 * 重寫＝父層換 key 重新掛載。內部座標是畫布像素，回報時轉成 viewBox 座標。
 */
export function TraceCanvas({ char, size = 342, onStrokesChange, onDevPass, highlight, testID = 'trace-canvas' }: TraceCanvasProps) {
  const t = useTheme();
  const data = strokesOf(char);
  const inner = size - 2; // TianGrid 的 1px 邊框
  const tf = useMemo(() => traceTransform(inner, data?.viewBox), [inner, data?.viewBox]);

  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [live, setLive] = useState<Point[] | null>(null);
  const strokesRef = useRef<Point[][]>([]);
  const liveRef = useRef<Point[] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devFiredRef = useRef(false);
  // PanResponder 只建立一次，用 ref 讀最新的 props
  const latest = useRef({ tf, onStrokesChange, onDevPass });
  latest.current = { tf, onStrokesChange, onDevPass };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  useEffect(() => clearTimer, []);

  // 漏掉的筆：每次有新的 highlight 就閃爍約 2 秒，之後持續亮著
  const [blinkDim, setBlinkDim] = useState(false);
  const highlightKey = highlight && highlight.length > 0 ? highlight.join(',') : '';
  useEffect(() => {
    if (!highlightKey) return;
    setBlinkDim(false);
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started >= BLINK_TOTAL_MS) {
        setBlinkDim(false);
        clearInterval(id);
      } else {
        setBlinkDim((d) => !d);
      }
    }, BLINK_MS);
    return () => clearInterval(id);
  }, [highlightKey]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        liveRef.current = [p];
        devFiredRef.current = false;
        setLive([p]);
        clearTimer();
        if (__DEV__ && latest.current.onDevPass) {
          timerRef.current = setTimeout(() => {
            devFiredRef.current = true;
            latest.current.onDevPass?.();
          }, DEV_LONG_PRESS_MS);
        }
      },
      onPanResponderMove: (e) => {
        const cur = liveRef.current;
        if (!cur) return;
        const p = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
        const last = cur[cur.length - 1];
        if (Math.hypot(p.x - last.x, p.y - last.y) < 1.5) return;
        if (Math.hypot(p.x - cur[0].x, p.y - cur[0].y) > LONG_PRESS_SLOP) clearTimer();
        const next = [...cur, p];
        liveRef.current = next;
        setLive(next);
      },
      onPanResponderRelease: () => finish(),
      onPanResponderTerminate: () => finish(),
    }),
  ).current;

  function finish() {
    clearTimer();
    const cur = liveRef.current;
    liveRef.current = null;
    setLive(null);
    if (!cur || devFiredRef.current) return; // 長按通過的那一下不算一筆
    const next = [...strokesRef.current, cur];
    strokesRef.current = next;
    setStrokes(next);
    const { tf: transform, onStrokesChange: cb } = latest.current;
    cb?.(next.map((s) => s.map((p) => toViewBox(p, transform))));
  }

  return (
    <TianGrid size={size}>
      <View
        testID={testID}
        accessibilityLabel="描寫畫布"
        style={[StyleSheet.absoluteFill]}
        {...pan.panHandlers}
      >
        <Svg width={inner} height={inner} pointerEvents="none">
          {data ? (
            <G transform={`translate(${tf.offset} ${tf.offset}) scale(${tf.scale})`}>
              {data.strokes.map((d, i) => (
                <Path
                  key={i}
                  d={d}
                  fill="none"
                  stroke={t.faint}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </G>
          ) : null}
          {data && highlight && highlight.length > 0 ? (
            <G transform={`translate(${tf.offset} ${tf.offset}) scale(${tf.scale})`} opacity={blinkDim ? 0.3 : 1}>
              {highlight.map((i) =>
                data.strokes[i] ? (
                  <Path
                    key={`h-${i}`}
                    testID={`trace-missing-${i}`}
                    d={data.strokes[i]}
                    fill="none"
                    stroke={t.accent}
                    strokeWidth={STROKE_WIDTH + 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null,
              )}
            </G>
          ) : null}
          {[...strokes, ...(live ? [live] : [])].map((s, i) => (
            <Path
              key={`u-${i}`}
              d={toPathD(s)}
              fill="none"
              stroke={t.text}
              strokeWidth={USER_LINE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    </TianGrid>
  );
}
