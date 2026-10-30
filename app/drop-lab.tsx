import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Icon, KanaText, PrimaryButton, Screen } from '../src/components';
import { shuffle } from '../src/logic/session';
import { useTopPad } from '../src/theme/layout';
import { useTheme } from '../src/theme/useTheme';

/**
 * 掉字歸類・手感實驗（只在開發版出現，入口在練習頁）。
 * 片假名從上面掉下來（同時最多 MAX_ACTIVE 個），用手指按住它拖到下面對應的平假名籃子再放開；
 * 對了得分、錯了扣血，放在籃子以外的地方會從放開的位置繼續掉。
 * 只做「片假名 → 平假名」一個階段、固定 し・つ・そ・ん，目的是試拖曳的手感。
 */
const PAIRS = [
  { kata: 'シ', hira: 'し' },
  { kata: 'ツ', hira: 'つ' },
  { kata: 'ソ', hira: 'そ' },
  { kata: 'ン', hira: 'ん' },
];
const ITEM = 64;
const ROUND_SIZE = 12;
/** 一個字從最上面掉到最底下要幾毫秒（太慢就調小、太快就調大） */
const FALL_MS = 5500;
/** 同時最多掉幾個字 */
const MAX_ACTIVE = 2;
/** 兩個字出現的最短間隔（毫秒），避免一起出現在同一個高度 */
const STAGGER_MS = 2200;
/** 放開時手指在籃子上方這麼多像素內也算放進籃子（容錯） */
const DROP_SLOP = 56;
const START_LIVES = 3;

type Flash = { index: number; kind: 'ok' | 'bad' } | null;
type ActiveItem = { id: number; kind: number; x: number };

function makeBag(): number[] {
  // 每個字出現次數一樣（各 3 次），順序打散，且不連續出現同一個
  const bag = shuffle(Array.from({ length: ROUND_SIZE }, (_, i) => i % PAIRS.length), Math.random);
  for (let i = 1; i < bag.length; i++) {
    if (bag[i] === bag[i - 1]) {
      const j = bag.findIndex((v, k) => k > i && v !== bag[i] && v !== bag[i + 1]);
      if (j > 0) [bag[i], bag[j]] = [bag[j], bag[i]];
    }
  }
  return bag;
}

interface FallingItemProps {
  id: number;
  kata: string;
  x: number;
  areaH: number;
  hover: SharedValue<number>;
  bx: SharedValue<number>;
  by: SharedValue<number>;
  bw: SharedValue<number>;
  /** 放開時回報位置；回傳 true 表示落在籃子（這個字由外面處理掉了），false 表示要繼續掉 */
  onDrop: (id: number, absX: number, absY: number) => boolean;
  onMiss: (id: number) => void;
}

/** 一個會掉下來、可以被拖曳的字：自己管動畫與手勢，結果交給外面。 */
function FallingItem(props: FallingItemProps) {
  const t = useTheme();
  const { kata, x: startX, hover, bx, by, bw } = props;
  const latest = useRef(props);
  latest.current = props;

  const y = useSharedValue(-ITEM);
  const x = useSharedValue(startX);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const grabbed = useSharedValue(0);

  const callMiss = useCallback(() => latest.current.onMiss(latest.current.id), []);

  const startFall = useCallback(
    (fromY: number) => {
      const total = latest.current.areaH;
      const remaining = Math.max(0.1, (total - fromY) / (total + ITEM));
      y.value = fromY;
      y.value = withTiming(total, { duration: FALL_MS * remaining, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(callMiss)();
      });
    },
    [callMiss, y],
  );

  const callDrop = useCallback(
    (absX: number, absY: number, curY: number) => {
      const handled = latest.current.onDrop(latest.current.id, absX, absY);
      if (!handled) startFall(curY);
    },
    [startFall],
  );

  useEffect(() => {
    startFall(-ITEM);
    return () => cancelAnimation(y);
  }, [startFall, y]);

  const pan = usePanGesture({
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
      hover.value =
        bw.value > 0 && e.absoluteY >= by.value - DROP_SLOP
          ? Math.min(3, Math.max(0, Math.floor(((e.absoluteX - bx.value) / bw.value) * 4)))
          : -1;
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
      runOnJS(callDrop)(e.absoluteX, e.absoluteY, y.value);
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
        <KanaText size={36} lineHeightRatio={1.2}>
          {kata}
        </KanaText>
      </Animated.View>
    </GestureDetector>
  );
}

export default function DropLab() {
  const t = useTheme();
  const router = useRouter();
  const topPad = useTopPad(56);
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 });
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [spawned, setSpawned] = useState(0);
  const [items, setItems] = useState<ActiveItem[]>([]);
  const [order, setOrder] = useState<number[]>(() => shuffle([0, 1, 2, 3], Math.random)); // 籃子順序（存 PAIRS 索引）
  const [flash, setFlash] = useState<Flash>(null);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [tutorial, setTutorial] = useState(true); // 第一次進來先看教學，按「開始」才開始掉字
  const [round, setRound] = useState(0); // 每開一局加 1（讓上一局的計時器失效）

  // 邏輯用 ref，避免手勢回呼拿到舊的 state
  const g = useRef({
    bag: makeBag(),
    spawned: 0,
    lives: START_LIVES,
    score: 0,
    nextId: 1,
    active: [] as ActiveItem[],
    order,
    lastSpawnAt: 0,
    running: false,
  });
  const basketRect = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const basketsRef = useRef<React.ComponentRef<typeof View>>(null);
  const areaRef = useRef({ w: 0, h: 0 });
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hover = useSharedValue(-1);
  const bx = useSharedValue(0);
  const by = useSharedValue(0);
  const bw = useSharedValue(0);

  const endGame = useCallback(() => {
    const s = g.current;
    s.running = false;
    s.active = [];
    setItems([]);
    setDone(true);
  }, []);

  const spawnOne = useCallback(() => {
    const s = g.current;
    const kind = s.bag[s.spawned];
    const w = areaRef.current.w;
    // 位置隨機，但跟另一個正在掉的字至少隔開一個字寬
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
    if (s.lives <= 0) {
      endGame();
      return;
    }
    if (s.spawned >= ROUND_SIZE) {
      if (s.active.length === 0) endGame();
      return;
    }
    if (s.active.length < MAX_ACTIVE && Date.now() - s.lastSpawnAt >= (s.active.length === 0 ? 600 : STAGGER_MS)) {
      spawnOne();
    }
  }, [endGame, spawnOne]);

  const finishItem = useCallback(
    (id: number, result: 'ok' | 'bad' | 'miss', slot: number) => {
      const s = g.current;
      const it = s.active.find((a) => a.id === id);
      if (!it) return;
      s.active = s.active.filter((a) => a.id !== id);
      setItems(s.active);
      const p = PAIRS[it.kind];
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (result === 'ok') {
        s.score += 1;
        setScore(s.score);
        setMessage('');
        setFlash({ index: slot, kind: 'ok' });
      } else {
        s.lives -= 1;
        setLives(s.lives);
        setMessage(result === 'miss' ? `掉到底了：${p.kata} 是 ${p.hira}` : `${p.kata} 是 ${p.hira}`);
        setFlash(slot >= 0 ? { index: slot, kind: 'bad' } : null);
      }
      flashTimer.current = setTimeout(() => setFlash(null), 700);
      if (s.lives <= 0) endGame();
    },
    [endGame],
  );

  const onMiss = useCallback((id: number) => finishItem(id, 'miss', -1), [finishItem]);

  /** 放開手指：判斷落在哪個籃子（以螢幕座標比對籃子列的位置）；落在籃子回傳 true */
  const onDrop = useCallback(
    (id: number, absX: number, absY: number) => {
      const s = g.current;
      const it = s.active.find((a) => a.id === id);
      if (!it) return true;
      const r = basketRect.current;
      const inRow = r.w > 0 && absY >= r.y - DROP_SLOP && absX >= r.x && absX <= r.x + r.w;
      if (!inRow) return false;
      const slot = Math.min(3, Math.max(0, Math.floor(((absX - r.x) / r.w) * 4)));
      finishItem(id, s.order[slot] === it.kind ? 'ok' : 'bad', slot);
      return true;
    },
    [finishItem],
  );

  const measureBaskets = useCallback(() => {
    basketsRef.current?.measureInWindow((px, py, w, h) => {
      basketRect.current = { x: px, y: py, w, h };
      bx.value = px;
      by.value = py;
      bw.value = w;
    });
  }, [bw, bx, by]);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    areaRef.current = { w: width, h: height };
    setAreaSize({ w: width, h: height });
  };

  // 教學按「開始」且區域量好之後，開始這一局
  useEffect(() => {
    if (tutorial || areaSize.h <= 0) return;
    const s = g.current;
    setTimeout(measureBaskets, 50);
    s.running = true;
    s.lastSpawnAt = 0;
    const timer = setInterval(pump, 250);
    return () => {
      clearInterval(timer);
      s.running = false;
    };
  }, [tutorial, round, areaSize.h, measureBaskets, pump]);

  const restart = () => {
    const s = g.current;
    s.bag = makeBag();
    s.spawned = 0;
    s.lives = START_LIVES;
    s.score = 0;
    s.active = [];
    s.order = shuffle([0, 1, 2, 3], Math.random);
    setOrder(s.order);
    setItems([]);
    setLives(START_LIVES);
    setScore(0);
    setSpawned(0);
    setMessage('');
    setFlash(null);
    setDone(false);
    setRound((r) => r + 1);
    setTimeout(measureBaskets, 100);
  };

  return (
    <Screen>
      <GestureHandlerRootView style={styles.root}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Pressable testID="lab-close" accessibilityRole="button" accessibilityLabel="關閉" onPress={() => router.back()} style={styles.close}>
            <Icon name="close" size={22} color={t.muted} />
          </Pressable>
          <Text style={{ color: t.muted, fontSize: 13 }}>手感實驗　{Math.min(spawned, ROUND_SIZE)}/{ROUND_SIZE}</Text>
          <View style={styles.stats}>
            <Text style={{ color: t.wrong, fontSize: 16 }}>{'♥'.repeat(Math.max(0, lives))}</Text>
            <Text testID="lab-score" style={{ color: t.text, fontSize: 18, fontWeight: '700' }}>{score}</Text>
          </View>
        </View>
        <Text style={[styles.hint, { color: t.muted }]}>用手指把掉下來的字拖到對應的平假名籃子</Text>

        <View style={styles.area} onLayout={onAreaLayout} testID="lab-area">
          {items.map((it) => (
            <FallingItem
              key={it.id}
              id={it.id}
              kata={PAIRS[it.kind].kata}
              x={it.x}
              areaH={areaSize.h}
              hover={hover}
              bx={bx}
              by={by}
              bw={bw}
              onDrop={onDrop}
              onMiss={onMiss}
            />
          ))}
          {message ? (
            <Text testID="lab-message" style={[styles.message, { color: t.wrongText }]}>
              {message}
            </Text>
          ) : null}
        </View>

        <View ref={basketsRef} onLayout={() => setTimeout(measureBaskets, 30)} style={styles.baskets}>
          {order.map((pairIndex, slot) => (
            <Basket key={`${slot}-${pairIndex}`} slot={slot} label={PAIRS[pairIndex].hira} hover={hover} flash={flash} />
          ))}
        </View>

        {tutorial ? (
          <View testID="lab-tutorial" style={[styles.overlay, { backgroundColor: t.bg, paddingHorizontal: 24 }]}>
            <Text style={{ color: t.text, fontSize: 24, fontWeight: '700' }}>怎麼玩</Text>
            <DragDemo />
            <View style={styles.steps}>
              <Text style={[styles.step, { color: t.text }]}>① 片假名會從上面掉下來，有時同時掉兩個</Text>
              <Text style={[styles.step, { color: t.text }]}>② 用手指<Text style={{ fontWeight: '700' }}>按住</Text>它</Text>
              <Text style={[styles.step, { color: t.text }]}>③ <Text style={{ fontWeight: '700' }}>拖到對的籃子</Text>再放開（ツ → つ）</Text>
              <Text style={[styles.stepSmall, { color: t.muted }]}>掉到最底下沒歸類，或歸錯，會扣一顆愛心；放在籃子外面，字會從那裡繼續掉。</Text>
            </View>
            <View style={{ width: '100%', paddingTop: 12 }}>
              <PrimaryButton testID="lab-start" label="開始" onPress={() => setTutorial(false)} />
            </View>
          </View>
        ) : null}

        {done ? (
          <View style={[styles.overlay, { backgroundColor: t.bg }]}>
            <Text style={{ color: t.muted, fontSize: 14 }}>這一局結束</Text>
            <Text testID="lab-final" style={{ color: t.text, fontSize: 48, fontWeight: '700' }}>
              {score} / {ROUND_SIZE}
            </Text>
            <Text style={{ color: t.muted, fontSize: 14, textAlign: 'center', paddingHorizontal: 24 }}>
              這只是試拖曳的手感：速度、同時掉兩個、籃子大小、好不好抓，你覺得怎麼樣？
            </Text>
            <View style={{ width: '100%', paddingHorizontal: 24, paddingTop: 16, gap: 10 }}>
              <PrimaryButton testID="lab-again" label="再來一局" onPress={restart} />
              <Pressable testID="lab-howto" accessibilityRole="button" onPress={() => setTutorial(true)} style={styles.howto}>
                <Text style={{ color: t.accentText, fontSize: 14, textDecorationLine: 'underline' }}>怎麼玩</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Screen>
  );
}

/** 教學用的示範動畫：字掉下來 → 手指按住 → 拖到「つ」籃子 → 籃子閃綠，循環播放。 */
function DragDemo() {
  const t = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);

  const W = 280;
  const basketW = (W - 18) / 4;
  const targetX = 1 * (basketW + 6) + basketW / 2 - 26; // 第 2 個籃子（つ）
  const labels = ['し', 'つ', 'そ', 'ん'];

  const itemStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.03, 0.78, 0.86, 1], [0, 1, 1, 0, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 0.28, 0.62, 1], [170, 170, targetX, targetX]) },
      { translateY: interpolate(p.value, [0, 0.2, 0.28, 0.62, 1], [0, 56, 56, 128, 128]) },
      { scale: interpolate(p.value, [0, 0.26, 0.3, 0.62, 0.7, 1], [1, 1, 1.15, 1.15, 1, 1]) },
    ],
  }));
  const fingerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.22, 0.28, 0.64, 0.7, 1], [0, 0, 1, 1, 0, 0]),
    transform: [
      { translateX: interpolate(p.value, [0, 0.28, 0.62, 1], [170, 170, targetX, targetX]) + 18 },
      { translateY: interpolate(p.value, [0, 0.2, 0.28, 0.62, 1], [0, 56, 56, 128, 128]) + 22 },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 0.62, 0.66, 0.8, 0.9, 1], [0, 0, 1, 1, 0, 0]),
  }));

  return (
    <View style={[styles.demo, { width: W }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.demoItem, { backgroundColor: t.surface, borderColor: t.line }, itemStyle]}>
        <KanaText size={30} lineHeightRatio={1.2}>
          ツ
        </KanaText>
      </Animated.View>
      <View style={styles.demoBaskets}>
        {labels.map((l, i) => (
          <View key={l} style={[styles.demoBasket, { width: basketW, borderColor: t.line, backgroundColor: t.surface }]}>
            {i === 1 ? (
              <Animated.View
                style={[StyleSheet.absoluteFill, { backgroundColor: t.correctSoft, borderColor: t.correct, borderWidth: 2, borderRadius: 14 }, flashStyle]}
              />
            ) : null}
            <KanaText size={24} lineHeightRatio={1.2}>
              {l}
            </KanaText>
          </View>
        ))}
      </View>
      <Animated.View style={[styles.finger, { backgroundColor: t.accent }, fingerStyle]} />
    </View>
  );
}

function Basket({
  slot,
  label,
  hover,
  flash,
}: {
  slot: number;
  label: string;
  hover: SharedValue<number>;
  flash: Flash;
}) {
  const t = useTheme();
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: hover.value === slot ? 1.08 : 1 }],
  }));
  const flashed = flash && flash.index === slot ? flash.kind : null;
  const border = flashed === 'ok' ? t.correct : flashed === 'bad' ? t.wrong : t.line;
  const bg = flashed === 'ok' ? t.correctSoft : flashed === 'bad' ? t.wrongSoft : t.surface;
  return (
    <Animated.View
      testID={`lab-basket-${slot}`}
      style={[styles.basket, { borderColor: border, backgroundColor: bg }, style]}
    >
      <KanaText size={32} lineHeightRatio={1.2}>
        {label}
      </KanaText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { minHeight: 52, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 90, justifyContent: 'flex-end', paddingRight: 8 },
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
  message: { position: 'absolute', left: 16, right: 16, bottom: 12, textAlign: 'center', fontSize: 15 },
  baskets: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 36, paddingTop: 8 },
  basket: { flex: 1, height: 84, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  demo: { height: 200, marginVertical: 12 },
  demoItem: { position: 'absolute', left: 0, top: 0, width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  demoBaskets: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 6 },
  demoBasket: { height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  finger: { position: 'absolute', left: 0, top: 0, width: 34, height: 34, borderRadius: 17, opacity: 0.55 },
  steps: { alignSelf: 'stretch', gap: 6, paddingTop: 4 },
  step: { fontSize: 16, lineHeight: 24 },
  stepSmall: { fontSize: 13, lineHeight: 20, paddingTop: 4 },
  howto: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 5 },
});
