import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { DropHowTo, Icon, KanaText, PrimaryButton, Screen, TextLink } from '../../src/components';
import {
  MAX_WRONG_TO_PASS,
  ROUND_SIZE,
  availableStages,
  basketColumns,
  basketOrder,
  buildRound,
  faceOf,
  isPassed,
  scoreEvents,
  slotAtPoint,
  type DropEvent,
  type DropFace,
} from '../../src/logic/dropGame';
import { isKatakanaUnlocked } from '../../src/logic/confusion';
import { recordConfusion, recordKanaResult } from '../../src/scoring';
import { progressList, useProgressStore, useSettingsStore } from '../../src/store';
import { useTopPad } from '../../src/theme/layout';
import { useTheme } from '../../src/theme/useTheme';

const ITEM = 64;
/** 一個字從最上面掉到最底下要幾毫秒 */
const FALL_MS = 5500;
/** 同時最多掉幾個字 */
const MAX_ACTIVE = 2;
/** 兩個字出現的最短間隔（毫秒） */
const STAGGER_MS = 2200;
/** 放開時手指在籃子上方這麼多像素內也算放進籃子（容錯） */
const DROP_SLOP = 56;

type Phase = 'tutorial' | 'playing' | 'paused' | 'stageEnd';
type Flash = { slot: number; kind: 'ok' | 'bad' } | null;
interface ActiveItem {
  id: number;
  /** 選字陣列的索引 */
  kind: number;
  x: number;
}

/** 掉字或籃子上的字：假名用假名字型，拼音用一般字。 */
function Face({ text, face, size }: { text: string; face: DropFace; size: number }) {
  const t = useTheme();
  if (face === 'romaji') {
    return <Text style={{ fontSize: size * 0.85, fontWeight: '700', color: t.text }}>{text}</Text>;
  }
  return (
    <KanaText size={size} lineHeightRatio={1.2}>
      {text}
    </KanaText>
  );
}

interface FallingItemProps {
  id: number;
  text: string;
  face: DropFace;
  x: number;
  areaH: number;
  paused: boolean;
  draggable: boolean;
  rects: SharedValue<number[]>;
  hover: SharedValue<number>;
  /** 放開時回報位置；回傳 true 表示落在籃子（這個字交給外面處理了），false 表示繼續掉 */
  onDrop: (id: number, absX: number, absY: number) => boolean;
  onMiss: (id: number) => void;
}

/** 一個會掉下來、可以被拖曳的字：自己管動畫與手勢，結果交給外面。 */
function FallingItem(props: FallingItemProps) {
  const t = useTheme();
  const { text, face, x: startX, rects, hover, paused, draggable } = props;
  const latest = useRef(props);
  latest.current = props;

  const y = useSharedValue(-ITEM);
  const x = useSharedValue(startX);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const grabbed = useSharedValue(0);

  const callMiss = useCallback(() => latest.current.onMiss(latest.current.id), []);

  /** 從目前位置繼續往下掉（在 UI 執行緒讀位置，剩多少路就花多少比例的時間） */
  const fall = useCallback(() => {
    const total = latest.current.areaH;
    runOnUI(() => {
      'worklet';
      const remaining = Math.max(0.05, (total - y.value) / (total + ITEM));
      y.value = withTiming(total, { duration: FALL_MS * remaining, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(callMiss)();
      });
    })();
  }, [callMiss, y]);

  const freeze = useCallback(() => {
    runOnUI(() => {
      'worklet';
      cancelAnimation(y);
    })();
  }, [y]);

  useEffect(() => {
    fall();
    return () => cancelAnimation(y);
    // 只在掛載時開始掉
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (paused) freeze();
    else fall();
  }, [paused, fall, freeze]);

  const callDrop = useCallback(
    (absX: number, absY: number) => {
      const handled = latest.current.onDrop(latest.current.id, absX, absY);
      if (!handled) fall();
    },
    [fall],
  );

  const pan = usePanGesture({
    enabled: draggable,
    onBegin: () => {
      'worklet';
      cancelAnimation(y);
      grabbed.value = 1;
      dx.value = 0;
      dy.value = 0;
    },
    onUpdate: (e) => {
      'worklet';
      dx.value = e.translationX;
      dy.value = e.translationY;
      hover.value = slotAtPoint(rects.value, e.absoluteX, e.absoluteY, DROP_SLOP);
    },
    onFinalize: (e) => {
      'worklet';
      // 把拖動的距離併回位置，再交給 JS 判斷
      x.value = x.value + dx.value;
      y.value = y.value + dy.value;
      dx.value = 0;
      dy.value = 0;
      grabbed.value = 0;
      hover.value = -1;
      runOnJS(callDrop)(e.absoluteX, e.absoluteY);
    },
  });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value + dx.value },
      { translateY: y.value + dy.value },
      { scale: grabbed.value ? 1.15 : 1 },
    ],
    zIndex: grabbed.value ? 10 : 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.item, { backgroundColor: t.surface, borderColor: t.line }, style]}>
        <Face text={text} face={face} size={36} />
      </Animated.View>
    </GestureDetector>
  );
}

function Basket({
  slot,
  text,
  face,
  hover,
  flash,
  cols,
  tappable,
  onTap,
  onRect,
}: {
  slot: number;
  text: string;
  face: DropFace;
  hover: SharedValue<number>;
  flash: Flash;
  cols: number;
  tappable: boolean;
  onTap: (slot: number) => void;
  onRect: (slot: number, r: [number, number, number, number]) => void;
}) {
  const t = useTheme();
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: hover.value === slot ? 1.08 : 1 }] }));
  const flashed = flash && flash.slot === slot ? flash.kind : null;
  const border = flashed === 'ok' ? t.correct : flashed === 'bad' ? t.wrong : t.line;
  const bg = flashed === 'ok' ? t.correctSoft : flashed === 'bad' ? t.wrongSoft : t.surface;
  const measure = () => ref.current?.measureInWindow((px, py, w, h) => onRect(slot, [px, py, w, h]));
  return (
    <Animated.View style={[{ width: `${100 / cols - 2}%`, flexGrow: 1 }, style]}>
      <View ref={ref} onLayout={() => setTimeout(measure, 30)} collapsable={false}>
        <Pressable
          testID={`drop-basket-${slot}`}
          accessibilityRole="button"
          accessibilityLabel={text}
          disabled={!tappable}
          onPress={() => onTap(slot)}
          style={[styles.basket, { borderColor: border, backgroundColor: bg }]}
        >
          <Face text={text} face={face} size={32} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function DropPlay() {
  const t = useTheme();
  const router = useRouter();
  const topPad = useTopPad(56);
  const { sel } = useLocalSearchParams<{ sel?: string }>();
  const selection = useMemo(() => (sel ? sel.split(',').filter(Boolean) : []), [sel]);
  const control = useSettingsStore((s) => s.dropControl);
  const tutorialSeen = useSettingsStore((s) => s.dropTutorialSeen);
  const progress = useProgressStore((s) => s.progress);
  const katakanaOn = useMemo(() => isKatakanaUnlocked(progressList(progress)), [progress]);
  const stages = useMemo(() => availableStages(selection, katakanaOn), [selection, katakanaOn]);

  const [stageIdx, setStageIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>(tutorialSeen ? 'playing' : 'tutorial');
  const [areaH, setAreaH] = useState(0);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [order, setOrder] = useState<number[]>(() => basketOrder(selection.length, Math.random));
  const [spawned, setSpawned] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [flash, setFlash] = useState<Flash>(null);
  const [message, setMessage] = useState('');
  const [round, setRound] = useState(0);
  const [outcome, setOutcome] = useState<{ wrong: number; passed: boolean } | null>(null);
  const [showHowto, setShowHowto] = useState(false);

  const stage = stages[Math.min(stageIdx, stages.length - 1)];
  const drag = control === 'drag';

  // 邏輯用 ref，避免手勢回呼拿到舊的 state
  const g = useRef({
    bag: buildRound(Math.max(1, selection.length), Math.random),
    spawned: 0,
    wrong: 0,
    nextId: 1,
    active: [] as ActiveItem[],
    order,
    events: [] as DropEvent[],
    lastSpawnAt: 0,
    running: false,
    ended: false,
  });
  const areaHRef = useRef(0);
  const areaWRef = useRef(0);
  const rectsRef = useRef<number[][]>([]);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rects = useSharedValue<number[]>([]);
  const hover = useSharedValue(-1);

  const syncRects = useCallback(() => {
    const list = rectsRef.current;
    if (list.length === g.current.order.length && list.every(Boolean)) rects.value = list.flat();
  }, [rects]);

  const onRect = useCallback(
    (slot: number, r: [number, number, number, number]) => {
      rectsRef.current[slot] = r;
      syncRects();
    },
    [syncRects],
  );

  const endRound = useCallback(() => {
    const s = g.current;
    if (s.ended) return;
    s.ended = true;
    s.running = false;
    s.active = [];
    setItems([]);
    const w = s.events.filter((e) => e.picked !== e.syllable).length;
    setOutcome({ wrong: w, passed: isPassed(w) });
    setPhase('stageEnd');
    // 離開不計分：只有打完一關才寫進計分
    const { results, confusions } = scoreEvents(s.events, stages[Math.min(stageIdx, stages.length - 1)]);
    results.forEach((r) => void recordKanaResult(r.kanaId, r.correct));
    confusions.forEach((c) => void recordConfusion(c.truth, c.picked));
  }, [stageIdx, stages]);

  const spawnOne = useCallback(() => {
    const s = g.current;
    const kind = s.bag[s.spawned];
    const w = areaWRef.current;
    let px = 8;
    for (let tries = 0; tries < 12; tries++) {
      px = 8 + Math.random() * Math.max(0, w - ITEM - 16);
      if (s.active.every((a) => Math.abs(a.x - px) >= ITEM + 12)) break;
    }
    s.spawned += 1;
    s.lastSpawnAt = Date.now();
    const item: ActiveItem = { id: s.nextId++, kind, x: px };
    s.active = [...s.active, item];
    setItems(s.active);
    setSpawned(s.spawned);
  }, []);

  /** 每 250ms 檢查一次：還有字沒出、場上不到 MAX_ACTIVE 個、距離上一個夠久，就再出一個 */
  const pump = useCallback(() => {
    const s = g.current;
    if (!s.running) return;
    if (s.spawned >= ROUND_SIZE) {
      if (s.active.length === 0) endRound();
      return;
    }
    if (s.active.length < MAX_ACTIVE && Date.now() - s.lastSpawnAt >= (s.active.length === 0 ? 600 : STAGGER_MS)) {
      spawnOne();
    }
  }, [endRound, spawnOne]);

  /** 一個字結束：slot 是放進的籃子（掉到底是 -1） */
  const finishItem = useCallback(
    (id: number, slot: number) => {
      const s = g.current;
      const it = s.active.find((a) => a.id === id);
      if (!it) return;
      s.active = s.active.filter((a) => a.id !== id);
      setItems(s.active);
      const syllable = selection[it.kind];
      const pickedSyllable = slot >= 0 ? selection[s.order[slot]] : undefined;
      s.events.push({ syllable, picked: pickedSyllable });
      const ok = pickedSyllable === syllable;
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (ok) {
        setMessage('');
        setFlash({ slot, kind: 'ok' });
      } else {
        s.wrong += 1;
        setWrong(s.wrong);
        const st = stages[Math.min(stageIdx, stages.length - 1)];
        const fell = faceOf(syllable, st.fall);
        const answer = faceOf(syllable, st.basket);
        setMessage(slot < 0 ? `掉到底了：${fell} 是 ${answer}` : `${fell} 是 ${answer}`);
        setFlash(slot >= 0 ? { slot, kind: 'bad' } : null);
      }
      flashTimer.current = setTimeout(() => setFlash(null), 700);
    },
    [selection, stageIdx, stages],
  );

  const onMiss = useCallback((id: number) => finishItem(id, -1), [finishItem]);

  const onDrop = useCallback(
    (id: number, absX: number, absY: number) => {
      const s = g.current;
      if (!s.active.some((a) => a.id === id)) return true;
      const slot = slotAtPoint(rectsRef.current.flat(), absX, absY, DROP_SLOP);
      if (slot < 0) return false;
      finishItem(id, slot);
      return true;
    },
    [finishItem],
  );

  /** 點籃子模式：最早掉下來的那一個字放進被點的籃子 */
  const onBasketTap = useCallback(
    (slot: number) => {
      const first = g.current.active[0];
      if (first) finishItem(first.id, slot);
    },
    [finishItem],
  );

  const startRound = useCallback(
    (idx: number) => {
      const s = g.current;
      s.bag = buildRound(selection.length, Math.random);
      s.spawned = 0;
      s.wrong = 0;
      s.active = [];
      s.events = [];
      s.order = basketOrder(selection.length, Math.random);
      s.ended = false;
      s.lastSpawnAt = 0;
      rectsRef.current = [];
      rects.value = [];
      setOrder(s.order);
      setItems([]);
      setSpawned(0);
      setWrong(0);
      setMessage('');
      setFlash(null);
      setOutcome(null);
      setStageIdx(idx);
      setRound((r) => r + 1);
      setPhase('playing');
    },
    [rects, selection.length],
  );

  // 遊戲進行中：每 250ms 檢查要不要出字
  useEffect(() => {
    if (phase !== 'playing' || areaH <= 0) return;
    const s = g.current;
    s.running = true;
    const timer = setInterval(pump, 250);
    return () => {
      clearInterval(timer);
      s.running = false;
    };
  }, [phase, round, areaH, pump]);

  // 切到背景自動暫停
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') setPhase((p) => (p === 'playing' ? 'paused' : p));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => () => void (flashTimer.current && clearTimeout(flashTimer.current)), []);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    areaWRef.current = e.nativeEvent.layout.width;
    areaHRef.current = e.nativeEvent.layout.height;
    setAreaH(e.nativeEvent.layout.height);
  };

  /** 開發版專用：直接把這一關結算成全對或全錯，讓 Maestro 不用真的拖（先前掉到底的字也一併覆蓋）。 */
  const devFinish = (allCorrect: boolean) => {
    const s = g.current;
    s.spawned = ROUND_SIZE;
    s.events = s.bag.map((kind) => ({
      syllable: selection[kind],
      picked: allCorrect ? selection[kind] : undefined,
    }));
    endRound();
  };

  if (selection.length < 3 || !stage) {
    return (
      <Screen>
        <View style={[styles.center, { paddingTop: topPad }]}>
          <Text style={{ color: t.muted }}>沒有選字</Text>
          <TextLink label="返回" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const cols = basketColumns(selection.length);
  const isLast = stageIdx >= stages.length - 1;
  const hint = drag ? '按住掉下來的，拖到對的籃子' : '點對的籃子，最下面的會放進去';

  return (
    <Screen>
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable
            testID="drop-pause"
            accessibilityRole="button"
            accessibilityLabel="暫停"
            onPress={() => setPhase((p) => (p === 'playing' ? 'paused' : p))}
            style={styles.close}
          >
            <Icon name="close" size={22} color={t.muted} />
          </Pressable>
          <View style={styles.titleBox}>
            <Text testID="drop-stage" style={{ color: t.text, fontSize: 15, fontWeight: '700' }}>
              階段 {stageIdx + 1}/{stages.length}　{stage.title}
            </Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>
              {Math.min(spawned, ROUND_SIZE)}/{ROUND_SIZE}　已錯 {wrong}（最多錯 {MAX_WRONG_TO_PASS} 個算過關）
            </Text>
          </View>
          <View style={styles.close} />
        </View>
        <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text>

        <View style={styles.area} onLayout={onAreaLayout} testID="drop-area">
          {items.map((it) => (
            <FallingItem
              key={`${round}-${it.id}`}
              id={it.id}
              text={faceOf(selection[it.kind], stage.fall)}
              face={stage.fall}
              x={it.x}
              areaH={areaH}
              paused={phase !== 'playing'}
              draggable={drag}
              rects={rects}
              hover={hover}
              onDrop={onDrop}
              onMiss={onMiss}
            />
          ))}
          {message ? (
            <Text testID="drop-message" style={[styles.message, { color: t.wrongText }]}>
              {message}
            </Text>
          ) : null}
        </View>

        <View style={styles.baskets}>
          {order.map((selIndex, slot) => (
            <Basket
              key={`${round}-${slot}`}
              slot={slot}
              text={faceOf(selection[selIndex], stage.basket)}
              face={stage.basket}
              hover={hover}
              flash={flash}
              cols={cols}
              tappable={!drag && phase === 'playing'}
              onTap={onBasketTap}
              onRect={onRect}
            />
          ))}
        </View>

        {__DEV__ ? (
          <View style={styles.dev}>
            <Pressable testID="dev-drop-pass" onPress={() => devFinish(true)}>
              <Text style={{ color: t.muted, fontSize: 11 }}>dev 全對</Text>
            </Pressable>
            <Pressable testID="dev-drop-fail" onPress={() => devFinish(false)}>
              <Text style={{ color: t.muted, fontSize: 11 }}>dev 全錯</Text>
            </Pressable>
          </View>
        ) : null}

        {phase === 'tutorial' ? (
          <View testID="drop-tutorial" style={[styles.overlay, { backgroundColor: t.bg, paddingHorizontal: 24 }]}>
            <DropHowTo control={control} />
            <View style={styles.full}>
              <PrimaryButton
                testID="drop-start"
                label="開始"
                onPress={() => {
                  useSettingsStore.getState().setDropTutorialSeen(true);
                  setPhase('playing');
                }}
              />
            </View>
          </View>
        ) : null}

        {phase === 'paused' ? (
          <View testID="drop-paused" style={[styles.overlay, { backgroundColor: t.bg }]} accessibilityViewIsModal>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>已暫停</Text>
            <Text style={{ color: t.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>
              現在離開的話，這一關不會計分。
            </Text>
            <View style={styles.full}>
              <PrimaryButton testID="drop-resume" label="繼續" onPress={() => setPhase('playing')} />
              <Pressable testID="drop-howto" accessibilityRole="button" onPress={() => setShowHowto(true)} style={styles.linkBtn}>
                <Text style={{ color: t.accentText, fontSize: 14, textDecorationLine: 'underline' }}>怎麼玩</Text>
              </Pressable>
              <Pressable testID="drop-leave" accessibilityRole="button" onPress={() => router.back()} style={styles.linkBtn}>
                <Text style={{ color: t.accentText, fontSize: 14, textDecorationLine: 'underline' }}>離開（這一關不計分）</Text>
              </Pressable>
            </View>
            {showHowto ? (
              <View style={[styles.overlay, { backgroundColor: t.bg, paddingHorizontal: 24 }]}>
                <DropHowTo control={control} />
                <View style={styles.full}>
                  <PrimaryButton label="知道了" onPress={() => setShowHowto(false)} />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {phase === 'stageEnd' && outcome ? (
          <View testID="drop-end" style={[styles.overlay, { backgroundColor: t.bg }]} accessibilityViewIsModal>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              階段 {stageIdx + 1}　{stage.title}
            </Text>
            <Text testID="drop-end-title" style={{ color: t.text, fontSize: 32, fontWeight: '700' }}>
              {outcome.passed ? (isLast ? '全部過關！' : '過關！') : '差一點'}
            </Text>
            <Text testID="drop-end-score" style={{ color: t.muted, fontSize: 15 }}>
              答對 {ROUND_SIZE - outcome.wrong} / {ROUND_SIZE}
              {outcome.passed ? '' : `（要錯 ${MAX_WRONG_TO_PASS} 個以內才過關）`}
            </Text>
            <View style={styles.full}>
              {outcome.passed && !isLast ? (
                <PrimaryButton testID="drop-next" label={`下一階段：${stages[stageIdx + 1].title}`} onPress={() => startRound(stageIdx + 1)} />
              ) : outcome.passed ? (
                <PrimaryButton testID="drop-again" label="再玩一次" onPress={() => startRound(0)} />
              ) : (
                <PrimaryButton testID="drop-retry" label="再試這一階段" onPress={() => startRound(stageIdx)} />
              )}
              <Pressable testID="drop-done" accessibilityRole="button" onPress={() => router.back()} style={styles.linkBtn}>
                <Text style={{ color: t.accentText, fontSize: 14, textDecorationLine: 'underline' }}>結束</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { minHeight: 52, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBox: { flex: 1, alignItems: 'center' },
  hint: { textAlign: 'center', fontSize: 13, paddingBottom: 4 },
  area: { flex: 1, overflow: 'hidden' },
  item: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ITEM,
    height: ITEM,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { position: 'absolute', left: 16, right: 16, top: 8, textAlign: 'center', fontSize: 15 },
  baskets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 28, paddingTop: 8 },
  basket: { height: 76, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dev: { position: 'absolute', right: 8, top: 100, gap: 4, opacity: 0.6, zIndex: 3 },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 5 },
  full: { width: '100%', paddingHorizontal: 24, paddingTop: 12, gap: 6 },
  linkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
